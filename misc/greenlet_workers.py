import gevent
import gevent.queue

from establishment.misc.command_processor import BaseProcessor
from establishment.misc.threading_helper import ThreadHandler
from establishment.funnel.redis_stream import RedisStreamPublisher, RedisStreamSubscriber, RedisQueue, \
    redis_response_to_json


class GreenletWorker(gevent.Greenlet):
    def __init__(self, logger=None, context=None):
        gevent.Greenlet.__init__(self)
        self.running = False
        self.logger = logger
        self.context = context

    def _run(self):
        self.running = True

        self.init()

        while self.running:
            try:
                self.tick()
                gevent.sleep(0)
            except Exception:
                self.log_exception("Error in worker " + str(self.__class__.__name__))
                self.cleanup()
                self.init()

    def init(self):
        pass

    def cleanup(self):
        pass

    def tick(self):
        pass

    def stop(self):
        self.running = False

    def log_exception(self, message):
        if self.logger:
            self.logger.exception(message)

    def log_error(self, message):
        if self.logger:
            self.logger.error(message)


class GreenletQueueWorker(GreenletWorker):
    def __init__(self, job_queue=None, result_queue=None, logger=None, context=None):
        super().__init__(logger=logger, context=context)
        self.job_queue = job_queue
        self.result_queue = result_queue

    def tick(self):
        try:
            command = self.job_queue.get(timeout=1)
        except gevent.queue.Empty:
            return

        result = self.process_command(command)
        if result:
            self.result_queue.put(result)

    def process_command(self, command):
        return None


class GreenletRedisQueueListener(GreenletQueueWorker):
    def __init__(self, job_queue, redis_queue_name, redis_connection=None, logger=None, context=None,
                 job_queue_max_size=1024, bulk_size=128):
        super().__init__(job_queue=job_queue, logger=logger, context=context)
        self.redis_queue_name = redis_queue_name
        self.redis_queue = None
        self.redis_connection = redis_connection
        self.job_queue_max_size = job_queue_max_size
        self.bulk_size = bulk_size
        self.activate_bulk_retrieval = False

    def init(self):
        if not self.redis_queue:
            self.redis_queue = RedisQueue(self.redis_queue_name, connection=self.redis_connection)

    def cleanup(self):
        self.redis_queue = None

    def tick(self):
        if self.job_queue.qsize() >= self.job_queue_max_size:
            gevent.sleep(0.5)
            return

        if self.activate_bulk_retrieval:
            jobs = self.redis_queue.bulk_pop(self.bulk_size)
            if len(jobs) == 0:
                self.activate_bulk_retrieval = False
        else:
            job = self.redis_queue.pop(timeout=1)
            if job:
                self.activate_bulk_retrieval = True
            jobs = [job]
        for job in jobs:
            job = redis_response_to_json(job)
            if job:
                self.job_queue.put(job)


class GreenletRedisStreamListener(GreenletQueueWorker):
    def __init__(self, job_queue, redis_stream_name, logger=None, context=None):
        super().__init__(job_queue=job_queue, logger=logger, context=context)
        self.redis_stream_name = redis_stream_name
        self.redis_stream_subscriber = None

    def init(self):
        if not self.redis_stream_subscriber:
            self.redis_stream_subscriber = RedisStreamSubscriber()
            self.redis_stream_subscriber.subscribe(self.redis_stream_name)

    def cleanup(self):
        self.redis_stream_subscriber = None

    def tick(self):
        message, stream_name = self.redis_stream_subscriber.next_message()

        message = redis_response_to_json(message)
        if message:
            self.job_queue.put(message)


class GreenletRedisStreamPublisher(GreenletQueueWorker):
    def __init__(self, result_queue, redis_stream_name, logger=None, context=None):
        super().__init__(result_queue=result_queue, logger=logger, context=context)
        self.redis_stream_name = redis_stream_name
        self.redis_stream_publisher = None

    def init(self):
        if not self.redis_stream_publisher:
            self.redis_stream_publisher = RedisStreamPublisher(self.redis_stream_name, raw=True)

    def cleanup(self):
        self.redis_stream_publisher = None

    def tick(self):
        try:
            result = self.result_queue.get(timeout=1)
        except gevent.queue.Empty:
            return

        if not result:
            return
        self.redis_stream_publisher.publish_json(result)


class GreenletRedisQueueCommandProcessor(BaseProcessor):
    def __init__(self, logger_name, WorkerClass, redis_queue_name_in, redis_stream_name_out=None, num_workers=10,
                 job_queue_max_size=1024):
        super().__init__(logger_name=logger_name)
        self.workers = []
        self.job_queue = None
        self.result_queue = None
        self.num_workers = num_workers
        self.job_queue_max_size = job_queue_max_size
        self.redis_queue_name_in = redis_queue_name_in
        self.redis_stream_name_out = redis_stream_name_out
        self.WorkerClass = WorkerClass
        self.worker_context = None

    def main(self):
        self.workers = []
        self.job_queue = gevent.queue.Queue()
        self.result_queue = gevent.queue.Queue()

        self.workers.append(GreenletRedisQueueListener(job_queue=self.job_queue, logger=self.logger,
                                                       redis_queue_name=self.redis_queue_name_in,
                                                       job_queue_max_size=self.job_queue_max_size))
        if self.redis_stream_name_out:
            self.workers.append(GreenletRedisStreamPublisher(result_queue=self.result_queue, logger=self.logger,
                                                             redis_stream_name=self.redis_stream_name_out))

        for i in range(self.num_workers):
            self.workers.append(self.WorkerClass(job_queue=self.job_queue, result_queue=self.result_queue,
                                                 logger=self.logger, context=self.worker_context))

        for worker in self.workers:
            worker.start()

        gevent.joinall(self.workers)
        self.workers = []
        self.job_queue = None
        self.result_queue = None
        self.logger.info("Gracefully stopped to process commands " + str(self.__class__.__name__))

    def start(self):
        self.background_thread = ThreadHandler("Command processor " + str(self.__class__.__name__), self.process,
                                               daemon=False)

    def stop(self):
        super().stop()
        for worker in self.workers:
            worker.stop()

