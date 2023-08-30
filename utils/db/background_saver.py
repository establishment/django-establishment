import queue
import threading
import time
from typing import Generic, Optional, Any, Callable

from django.db import OperationalError

from establishment.utils.object_cache import ModelT
from utils.db.helpers import reset_db_connections  # TODO @establify fix


# The background running thread will be started when the first object will be added in the queue
# When adding a new type of object here, consider merging the threads into a single background one
class BackgroundObjectSaver(Generic[ModelT]):
    DEFAULT_LOOP_SLEEP = 0.01

    def __init__(self, obj_type: type[ModelT],
                 queue_size: int = 8192,
                 max_batch_size: int = 128,
                 num_save_tries: int = 2,
                 loop_sleep: float = DEFAULT_LOOP_SLEEP,
                 on_save_error: Optional[Callable[[Exception], Any]] = None):
        self.object_type = obj_type
        self.object_queue: queue.Queue[ModelT] = queue.Queue(maxsize=queue_size)
        self.max_batch_size = max_batch_size
        self.num_save_tries = num_save_tries
        self.loop_sleep = loop_sleep
        self.should_run_loop: bool = False
        self.background_thread: Optional[threading.Thread] = None
        self.on_save_error = on_save_error
        self.lock = threading.Lock()

        # TODO @Mihai these values need to be incremented atomically, good enough for some rough stats for now, thanks to the GIL
        self.num_dropped_on_insertion = 0  # Number of objects dropped on insertion into the queue
        self.num_dropped_on_save = 0  # Number of objects dropped on save to DB
        self.num_inserted = 0
        self.num_saved = 0

    def get_stats(self) -> dict[str, Any]:
        return {
            "queue_size": self.queue_size(),
            "num_inserted": self.num_inserted,
            "num_saved": self.num_saved,
            "num_dropped_on_insertion": self.num_dropped_on_save,
            "num_dropped_on_save": self.num_dropped_on_save,
        }

    def queue_size(self) -> int:
        return self.object_queue.qsize()

    def add(self, obj: ModelT) -> bool:
        self.ensure_started()
        try:
            self.object_queue.put_nowait(obj)
            self.num_inserted += 1
        except queue.Full:
            self.num_dropped_on_insertion += 1
            return False

        return True

    def add_batch(self, objects: list[ModelT]) -> int:
        num_added = 0
        for obj in objects:
            if self.add(obj):
                num_added += 1
        return num_added

    def handle_unexpected_save_error(self, exc: Exception):
        if self.on_save_error:
            self.on_save_error(exc)

    # Run this method only in a single thread ideally
    # Return how many objects were successfully added
    def process_pending_messages(self) -> int:
        try:
            obj = self.object_queue.get_nowait()
        except queue.Empty:
            return 0

        objects_to_insert: list[ModelT] = [obj]
        while len(objects_to_insert) < self.max_batch_size:
            try:
                obj = self.object_queue.get_nowait()
                objects_to_insert.append(obj)
            except queue.Empty:
                break

        batch_size = len(objects_to_insert)

        for save_iter_count in range(self.num_save_tries):
            try:
                self.object_type.objects.bulk_create(objects_to_insert)
                self.num_saved += batch_size
                # Exit on a successful save
                return batch_size
            except OperationalError as e:
                pass
            except Exception as e:
                self.handle_unexpected_save_error(e)

            reset_db_connections()
            time.sleep(save_iter_count * 1.0)

        self.num_dropped_on_save += batch_size
        return 0

    def safe_process_pending_message(self) -> int:
        try:
            return self.process_pending_messages()
        except Exception as e:
            self.handle_unexpected_save_error(e)

        return 0

    def run_processing_loop(self):
        while self.should_run_loop:
            self.safe_process_pending_message()
            time.sleep(self.loop_sleep)

        reset_db_connections()

    def ensure_started(self) -> None:
        with self.lock:
            if self.background_thread is None:
                self.should_run_loop = True
                self.background_thread = threading.Thread(target=self.run_processing_loop,
                                                          name=f"Background Saver for {self.object_type.__name__}",
                                                          daemon=True)
                self.background_thread.start()

    # Set the stopped flag and wait until everything is saved
    def ensure_stopped(self) -> None:
        self.should_run_loop = False

        while self.queue_size() > 0:
            try:
                self.object_queue.get_nowait()
                self.num_dropped_on_insertion += 1
            except queue.Empty:
                break

        with self.lock:
            if self.background_thread:
                self.background_thread.join()
                self.background_thread = None
