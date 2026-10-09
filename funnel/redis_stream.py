import json
import logging
import time
import threading
import uuid
from collections import OrderedDict
from collections.abc import Callable
from contextlib import contextmanager
from typing import Union, Any, NamedTuple, Optional

from django.conf import settings
from django.db import connections
from redis import StrictRedis, ConnectionPool

from establishment.misc.util import jsonify, same_dict
from establishment.misc.threading_helper import ThreadIntervalHandler
from establishment.funnel.encoder import StreamJSONEncoder


redis_connection_pool = None


def redis_response_to_json(data: Optional[Union[str, bytes]]) -> Any:
    if data is None:
        return None

    if isinstance(data, bytes):
        data = str(data, "utf-8")

    return json.loads(data)


def get_default_redis_connection_pool() -> ConnectionPool:
    global redis_connection_pool
    if redis_connection_pool is None:
        redis_connection_pool = ConnectionPool(**settings.REDIS_CONNECTION)
    return redis_connection_pool


class RetryRedis(StrictRedis):
    def __init__(self, num_retries=5, **kwargs):
        super().__init__(**kwargs)
        self.num_retries = num_retries

    def execute_command(self, *args, **options):
        for num_try in range(self.num_retries):
            try:
                return super().execute_command(*args, **options)
            except (ConnectionError, TimeoutError) as e:
                if num_try == self.num_retries - 1:
                    raise e


def simple_stream_publish(stream_name: str, message: Union[str, dict]) -> None:
    connection = RetryRedis(connection_pool=get_default_redis_connection_pool())
    
    if isinstance(message, dict):
        message = StreamJSONEncoder.dumps(message)

    connection.publish(stream_name, message)


class RedisStreamPublisher(object):
    message_timeout = 60 * 60 * 5   # Default expire time - 5 hours
    global_connection = None

    def __init__(self, stream_name: str, connection=None, persistence=True, raw=False, expire_time=None):
        if not connection:
            connection = RetryRedis(connection_pool=get_default_redis_connection_pool())
        self.connection = connection
        self.name = stream_name
        self.persistence = persistence
        self.raw = raw
        if expire_time is not None:
            self.expire_time = expire_time
        else:
            self.expire_time = RedisStreamPublisher.message_timeout
        # TODO: create the publish connection here

    def publish(self, message: Any) -> str:
        return RedisStreamPublisher.publish_to_stream(self.name, message, connection=self.connection,
                                                      persistence=self.persistence, raw=self.raw,
                                                      expire_time=self.expire_time)

    def publish_json(self, message: Any) -> str:
        return RedisStreamPublisher.publish_to_stream(self.name, message, connection=self.connection,
                                                      persistence=self.persistence, raw=self.raw,
                                                      expire_time=self.expire_time)

    @classmethod
    def get_global_connection(cls) -> StrictRedis:
        if cls.global_connection is None:
            cls.global_connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        return cls.global_connection

    @classmethod
    def publish_to_stream(cls, stream_name: str, message: Any, serializer_class=StreamJSONEncoder,
                          connection: Optional[StrictRedis] = None, persistence: bool = True, raw: bool = False, expire_time: Optional[int] = None) -> str:
        if connection is None:
            connection = cls.get_global_connection()
        original_message = message
        if not isinstance(message, str):
            message = json.dumps(message, cls=serializer_class)
        if not raw:
            if persistence:
                message_id = connection.incr(cls.get_stream_id_counter(stream_name))
                if expire_time is None:
                    expire_time = cls.message_timeout
                connection.setex(cls.get_stream_message_id_prefix(stream_name) + str(message_id), expire_time, message)
                message = cls.format_message_with_id(message, message_id)
            else:
                message = cls.format_message_vanilla(message)
        for iters in range(5):
            try:
                connection.publish(stream_name, message)
                break
            except Exception:
                pass
        return original_message

    @classmethod
    def get_stream_id_counter(cls, stream_name: str) -> str:
        return "meta-" + stream_name + "-id-counter"

    @classmethod
    def get_stream_message_id_prefix(cls, stream_name: str) -> str:
        return "meta-" + stream_name + "-msg-id-"

    @classmethod
    def format_message_with_id(cls, message: str, message_id: int) -> str:
        return "i " + str(message_id) + " " + message

    @classmethod
    def format_message_vanilla(cls, message: str) -> str:
        return "v " + message


# TODO @Mihai @cleanup seems like a lot of constants here. Maybe this whole file should be broken up
# A rebuild's lock between heartbeats: short, so one that died is noticed within seconds
LOCK_SECONDS = 5
# Keeps a value readable a little past its pointer, for whoever read the pointer just before it expired
VALUE_MARGIN_SECONDS = 10
# How long a reader waits for another process's rebuild before doing it itself
MAX_WAIT_SECONDS = 30
# How long a keeper leaves a value whose rebuild failed to its readers, rather than holding a lease nothing fulfils
FAILED_KEEP_BACKOFF_SECONDS = 10
# The process's copies of values it read, so a reader whose version matches never fetches a large one again
LOCAL_COPY_BYTES = 32 * 1024 * 1024

RELEASE_LOCK_LUA = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
end
return 0
"""
RENEW_LOCK_LUA = """
if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("PEXPIRE", KEYS[1], ARGV[2])
end
return 0
"""

logger = logging.getLogger(__name__)


class LocalCopies:
    def __init__(self, max_bytes: int):
        self.max_bytes = max_bytes
        self.entries: OrderedDict[str, tuple[str, str]] = OrderedDict()
        self.size = 0
        self.lock = threading.Lock()

    def get(self, key: str, version: str) -> Optional[str]:
        with self.lock:
            entry = self.entries.get(key)
            if entry is None or entry[0] != version:
                return None
            self.entries.move_to_end(key)
            return entry[1]

    def put(self, key: str, version: str, value: str) -> None:
        if len(value) > self.max_bytes:
            return
        with self.lock:
            previous = self.entries.pop(key, None)
            if previous is not None:
                self.size -= len(previous[1])
            self.entries[key] = (version, value)
            self.size += len(value)
            while self.size > self.max_bytes:
                evicted = self.entries.popitem(last=False)[1]
                self.size -= len(evicted[1])


# What a key holds, pointing at the value stored under "<key>@<version>", so a known version is a small read
class Pointer(NamedTuple):
    version: str
    generated_at: float
    marker: str  # What the watched keys held when the value was generated


class RedisCache:
    connection_pool = None
    # One per process, shared by every cache object in it
    local_copies = LocalCopies(LOCAL_COPY_BYTES)

    def __init__(self, key_prefix="cache-", redis_connection=None, watch_connection=None):
        self.key_prefix = key_prefix
        self.redis_connection = redis_connection or StrictRedis(connection_pool=self.get_default_connection_pool())
        # Watched keys are read where their publishers write them, which need not be the cache's own Redis
        self.watch_connection = watch_connection

    @classmethod
    def get_default_connection_pool(cls):
        if not cls.connection_pool:
            cls.connection_pool = ConnectionPool(**settings.REDIS_CONNECTION_CACHING)
        return cls.connection_pool

    @staticmethod
    def serialize(value, cls=StreamJSONEncoder):
        return json.dumps(value, cls=cls)

    @staticmethod
    def deserialize(value):
        return redis_response_to_json(value)

    # Stored as "<version>:<generated at>:<marker>"; anything else, such as a value from an older format, reads as missing
    @staticmethod
    def parse_pointer(raw: Optional[str | bytes]) -> Optional[Pointer]:
        if raw is None:
            return None
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8", "replace")
        parts = raw.split(":", 2)
        if len(parts) != 3 or len(parts[0]) != 32:
            return None
        try:
            return Pointer(parts[0], float(parts[1]), parts[2])
        except ValueError:
            return None

    # Names each key beside its value, so watching a different set of keys reads as a change
    @staticmethod
    def make_marker(watched_keys: list[str], values: list[Optional[bytes]]) -> str:
        pairs = []
        for key, value in zip(watched_keys, values):
            text = value.decode("utf-8", "replace") if isinstance(value, bytes) else ""
            pairs.append(key + "=" + text)
        return ",".join(pairs)

    # The pointer, then what its watched keys hold now
    def read_state(self, cached: CachedValue) -> tuple[Optional[Pointer], str]:
        pointer = self.parse_pointer(self.redis_connection.get(cached.key))
        if not cached.watched_keys:
            return pointer, ""
        if self.watch_connection is None:
            # The streams' Redis by default, opened only for a value that watches keys, since a site may configure none
            self.watch_connection = RedisStreamPublisher.get_global_connection()
        return pointer, self.make_marker(cached.watched_keys, self.watch_connection.mget(cached.watched_keys))

    def has_value(self, key: str, version: str) -> bool:
        return bool(self.redis_connection.exists(key + "@" + version))

    def read_value(self, key: str, version: str) -> Optional[str]:
        value = self.local_copies.get(key, version)
        if value is None:
            raw = self.redis_connection.get(key + "@" + version)
            if raw is None:
                return None
            value = raw.decode("utf-8") if isinstance(raw, bytes) else raw
            self.local_copies.put(key, version, value)
        return value

    # The watched keys are read first, so a change made while generating leaves the new value already stale
    def rebuild(self, cached: CachedValue) -> str:
        previous, marker = self.read_state(cached)
        serialized_value = self.serialize(cached.generator())
        version = uuid.uuid4().hex
        pipeline = self.redis_connection.pipeline()
        pipeline.set(cached.key + "@" + version, serialized_value, px=int((cached.hard_timeout + VALUE_MARGIN_SECONDS) * 1000))
        pipeline.set(cached.key, version + ":" + repr(time.time()) + ":" + marker, px=int(cached.hard_timeout * 1000))
        # A replaced value is kept only for the readers already holding its pointer, or back to back rebuilds pile up
        if previous is not None:
            pipeline.pexpire(cached.key + "@" + previous.version, int(VALUE_MARGIN_SECONDS * 1000))
        pipeline.execute()
        self.local_copies.put(cached.key, version, serialized_value)
        return serialized_value

    def try_lock(self, lock_key: str, token: str) -> bool:
        return bool(self.redis_connection.set(lock_key, token, nx=True, px=int(LOCK_SECONDS * 1000)))

    def renew_lock(self, lock_key: str, token: str) -> bool:
        return bool(self.redis_connection.eval(RENEW_LOCK_LUA, 1, lock_key, token, int(LOCK_SECONDS * 1000)))

    def release_lock(self, lock_key: str, token: str) -> None:
        self.redis_connection.eval(RELEASE_LOCK_LUA, 1, lock_key, token)

    # Renewed while the rebuild runs, so a slow one keeps its lock; only the holder may release it
    @contextmanager
    def held_lock(self, lock_key: str, token: str):
        done = threading.Event()

        def renew():
            while not done.wait(LOCK_SECONDS / 3):
                self.renew_lock(lock_key, token)

        heartbeat = threading.Thread(target=renew, name="cache-lock-heartbeat", daemon=True)
        heartbeat.start()
        try:
            yield
        finally:
            done.set()
            heartbeat.join()
            self.release_lock(lock_key, token)

    # A stale value is still served, while one process recalculates it on a thread of its own
    def refresh_in_background(self, cached: CachedValue) -> None:
        token = uuid.uuid4().hex
        if not self.try_lock(cached.lock_key, token):
            return

        def refresh():
            try:
                with self.held_lock(cached.lock_key, token):
                    self.rebuild(cached)
            except Exception:
                logger.exception("Background refresh of " + cached.key + " failed")
            finally:
                # A thread's database connections are its own, and nothing else would close them
                connections.close_all()

        threading.Thread(target=refresh, name="cache-refresh", daemon=True).start()

    def read_current_value(self, cached: CachedValue) -> Optional[str]:
        pointer = self.parse_pointer(self.redis_connection.get(cached.key))
        if pointer is None:
            return None
        return self.read_value(cached.key, pointer.version)

    # Cold, or past the hard timeout: one process rebuilds while the others wait, taking over if its lock lapses
    def rebuild_once(self, cached: CachedValue, retry_interval: float) -> str:
        token = uuid.uuid4().hex
        deadline = time.time() + MAX_WAIT_SECONDS
        while True:
            if self.try_lock(cached.lock_key, token):
                with self.held_lock(cached.lock_key, token):
                    # A rebuild that finished between the last look and taking the lock has done the work already
                    value = self.read_current_value(cached)
                    if value is not None:
                        return value
                    return self.rebuild(cached)
            if time.time() >= deadline:
                logger.warning("Rebuilding " + cached.key + " without its lock, after waiting on another rebuild")
                return self.rebuild(cached)
            time.sleep(retry_interval)
            value = self.read_current_value(cached)
            if value is not None:
                return value

    def get_or_set(self, key: str, generator: Callable, timeout: float, hard_timeout: Optional[float] = None, retry_interval: float = 0.05, unchanged_timeout: Optional[float] = None, watched_keys: Optional[list[str]] = None) -> Any:
        cached = CachedValue(generator, timeout, key, self, hard_timeout, unchanged_timeout=unchanged_timeout, watched_keys=watched_keys)
        return cached.get(retry_interval)


class RedisCacheSerialized(RedisCache):
    @staticmethod
    def deserialize(value):
        if isinstance(value, bytes):
            value = str(value, "utf-8")
        return value


# Fresh for `timeout`, or for `unchanged_timeout` while no watched key moves; served stale up to `hard_timeout` while rebuilt
class CachedValue:
    cache_class: type[RedisCache] = RedisCache

    def __init__(self, generator: Callable, timeout: float, key: Optional[str] = None, cache: Optional[RedisCache] = None, hard_timeout: Optional[float] = None, unchanged_timeout: Optional[float] = None, watched_keys: Optional[list[str]] = None):
        self.generator = generator
        self.timeout = timeout
        self.unchanged_timeout = max(timeout, unchanged_timeout or timeout)
        self.hard_timeout = max(self.unchanged_timeout, hard_timeout or timeout)
        self.watched_keys = watched_keys or []
        self.cache = cache or self.cache_class()
        self.key = (self.cache.key_prefix or "") + (key or generator.__name__)
        self.lock_key = "lock-" + self.key

    # The one rule for readers and keepers alike
    def is_stale(self, pointer: Pointer, marker: str) -> bool:
        age = time.time() - pointer.generated_at
        return age >= self.unchanged_timeout or (pointer.marker != marker and age >= self.timeout)

    def get(self, retry_interval: float = 0.05) -> Any:
        pointer, marker = self.cache.read_state(self)
        if pointer is not None:
            if self.hard_timeout > self.timeout and self.is_stale(pointer, marker):
                self.cache.refresh_in_background(self)
            value = self.cache.read_value(self.key, pointer.version)
            if value is not None:
                return self.cache.deserialize(value)

        return self.cache.deserialize(self.cache.rebuild_once(self, retry_interval))


# Keeps values fresh from one process, holding each one's lock as a lease so that readers serve them and never rebuild
class CacheKeeper:
    def __init__(self) -> None:
        self.token = uuid.uuid4().hex
        self.kept: dict[str, CachedValue] = {}
        self.rebuilds: dict[str, threading.Thread] = {}
        self.failed_until: dict[str, float] = {}

    # Called about once a second with every value to keep: a lease left unrenewed lapses, and readers take over
    def keep(self, values: list[CachedValue]) -> None:
        now = time.time()
        wanted = {cached.key: cached for cached in values if self.failed_until.get(cached.key, 0) <= now}
        for key, cached in self.kept.items():
            if key not in wanted:
                cached.cache.release_lock(cached.lock_key, self.token)
        self.rebuilds = {key: thread for key, thread in self.rebuilds.items() if key in wanted or thread.is_alive()}

        kept = {}
        for key, cached in wanted.items():
            # Someone else's lock is a rebuild under way, so the lease waits for the next call
            if cached.cache.renew_lock(cached.lock_key, self.token) or cached.cache.try_lock(cached.lock_key, self.token):
                kept[key] = cached
        self.kept = kept
        for cached in kept.values():
            self.rebuild_if_stale(cached)

    def rebuild_if_stale(self, cached: CachedValue) -> None:
        running = self.rebuilds.get(cached.key)
        if running is not None and running.is_alive():
            return
        pointer, marker = cached.cache.read_state(cached)
        # A value evicted under memory pressure leaves its pointer behind, and readers would wait on it
        if pointer is not None and not cached.is_stale(pointer, marker) and cached.cache.has_value(cached.key, pointer.version):
            return

        # Back to back while the value goes stale during its own rebuild, for as long as the lease is still ours
        def rebuild():
            try:
                while True:
                    cached.cache.rebuild(cached)
                    rebuilt, current_marker = cached.cache.read_state(cached)
                    if rebuilt is not None and not cached.is_stale(rebuilt, current_marker):
                        return
                    if cached.key not in self.kept or not cached.cache.renew_lock(cached.lock_key, self.token):
                        return
            except Exception:
                logger.exception("Keeping " + cached.key + " fresh failed")
                self.failed_until[cached.key] = time.time() + FAILED_KEEP_BACKOFF_SECONDS
            finally:
                connections.close_all()

        thread = threading.Thread(target=rebuild, name="cache-keeper-rebuild", daemon=True)
        self.rebuilds[cached.key] = thread
        thread.start()


def serialize_arguments(*args, **kwargs):
    def serialize(value):
        if hasattr(value, "id"):
            return value.__class__.__name__ + str(value.id)
        else:
            return value.__repr__()

    args_serialized = [serialize(arg) for arg in args]
    kwargs_serialized = [key + "=" + serialize(kwargs[key]) for key in sorted(kwargs.keys())]

    return ",".join(args_serialized + kwargs_serialized)


def redis_cached(expiration: float, *cache_args, **cache_kwargs) -> Callable:
    def _decorator(func: Callable) -> Callable:
        def _wrapped_call(*func_args, **func_kwargs):
            redis_cache = RedisCache()
            key_name = func.__name__ + ":" + serialize_arguments(*func_args, **func_kwargs)
            return redis_cache.get_or_set(key_name, func, expiration, *cache_args, **cache_kwargs)
        return _wrapped_call

    return _decorator


class RedisPriorityQueue(object):
    def __init__(self, name: str, **connection_info):
        self.name = name
        self.redis_connection = StrictRedis(**connection_info)

    # Adds the value with priority score, answering whether it was new; keep_existing leaves a queued one's score alone
    def push(self, score: float, value: str, keep_existing: bool = False) -> bool:
        flags = ["NX"] if keep_existing else []
        return self.redis_connection.execute_command("ZADD", self.name, *flags, score, value) == 1

    def pop(self) -> bool:
        """
        Removes the first element in queue
        :return: true if an element was removed, false if the queue was empty
        """
        return self.redis_connection.zremrangebyrank(self.name, 0, 0) > 0

    def get(self) -> Optional[str]:
        """
        :return: the first element in queue or None if the queue is empty
        """
        result = self.redis_connection.zrange(self.name, 0, 0)
        if len(result) > 0:
            return result[0]
        else:
            return None

    # The first element with its score, removed from the queue, or None if the queue was empty
    def get_and_pop(self) -> Optional[tuple[bytes, float]]:
        pipeline = self.redis_connection.pipeline(transaction=True)
        pipeline.zrange(self.name, 0, 0, withscores=True)
        pipeline.zremrangebyrank(self.name, 0, 0)
        result = pipeline.execute()
        if len(result[0]) > 0:
            return result[0][0]
        else:
            return None


class RedisQueue(object):
    def __init__(self, queue_name, connection=None, max_size=16*1024):
        self.queue_name = queue_name
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.redis_connection = connection
        self.max_size = max_size
        self.last_size = None
        self.pipe = self.redis_connection.pipeline(transaction=True)

    def push(self, value):
        self.last_size = self.redis_connection.lpush(self.queue_name, value)
        if self.last_size:
            if self.last_size > self.max_size:
                self.redis_connection.rpop(self.queue_name)
                return False
        return True

    def update_length(self):
        self.last_size = self.redis_connection.llen(self.queue_name)

    def length(self, update=False):
        if update:
            self.update_length()
        return self.last_size

    def pop(self, timeout=None):
        if not timeout:
            return self.redis_connection.rpop(self.queue_name)
        result = self.redis_connection.brpop(self.queue_name, timeout=timeout)
        if result:
            return result[1]
        return None

    def bulk_pop(self, bulk_size):
        self.pipe.lrange(self.queue_name, 0, bulk_size)
        self.pipe.ltrim(self.queue_name, bulk_size + 1, -1)
        return self.pipe.execute()[0]


# Implementation for Redis server 2.6.12 or greater and redis-py 2.7.4 or greater
class RedisMutex(object):
    keep_alive_thread = None
    acquired_mutexes_mutex = threading.Lock()
    acquired_mutexes: set[str] = set()

    @classmethod
    def keep_alive_thread_worker(cls):
        with cls.acquired_mutexes_mutex:
            if len(cls.acquired_mutexes) == 0:
                cls.keep_alive_thread = None
                return True
            for redis_mutex in cls.acquired_mutexes:
                redis_mutex.renew()
        return False

    @classmethod
    def ensure_keep_alive_thread(cls):
        if cls.keep_alive_thread:
            return
        cls.keep_alive_thread = ThreadIntervalHandler("RedisMutex.KeepAlive", cls.keep_alive_thread_worker, 10)

    def __init__(self, mutex_name, connection=None, expire=30, owner_id="default_id"):
        self.owner_id = owner_id
        self.mutex_name = mutex_name
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.redis_connection = connection
        self.redis_mutex_key = "mutex." + self.mutex_name
        self.acquired = False
        self.expire = expire

    def try_acquire(self):
        if self.acquired:
            return True
        result = self.redis_connection.set(self.redis_mutex_key, self.owner_id, nx=True, ex=self.expire)
        if result is None or result == 0:
            self.acquired = False
            return False
        self.acquired = True
        with RedisMutex.acquired_mutexes_mutex:
            RedisMutex.acquired_mutexes.add(self)
        RedisMutex.ensure_keep_alive_thread()
        return True

    def renew(self):
        if self.acquired:
            self.redis_connection.expire(self.redis_mutex_key, self.expire)

    def release(self):
        if self.acquired:
            self.redis_connection.delete(self.redis_mutex_key)
            with RedisMutex.acquired_mutexes_mutex:
                RedisMutex.acquired_mutexes.remove(self)
            self.acquired = False

    def acquire(self, interval=0.5):
        while not self.try_acquire():
            time.sleep(interval)

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


class RedisScheduledJob(object):
    def __init__(self, name, connection=None, time_interval=1):
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.redis_connection = connection
        self.name = name
        self.redis_mutex_name = "scheduled-job." + self.name
        self.redis_job_data_key = "scheduled-job." + self.name + ".job_data"
        self.redis_mutex = RedisMutex(self.redis_mutex_name, connection=connection)
        self.redis_job_data = {}
        self.redis_timestamp = None
        self.redis_time_interval = time_interval
        self.job_data = None
        self.time_interval = time_interval
        self.job_start_timestamp = 0
        self.acquired = False
        self.acquire_fail_code = 0

    def get_data(self):
        self.redis_timestamp = None
        self.redis_time_interval = None
        self.job_data = None
        self.redis_job_data = redis_response_to_json(self.redis_connection.get(self.redis_job_data_key))
        if self.redis_job_data is None:
            return
        if "data" in self.redis_job_data:
            self.job_data = self.redis_job_data["data"]
        if "timestamp" in self.redis_job_data:
            self.redis_timestamp = float(self.redis_job_data["timestamp"])
        if "timeInterval" in self.redis_job_data:
            self.redis_time_interval = float(self.redis_job_data["timeInterval"])

    def set_data(self):
        self.redis_job_data = {
            "data": self.job_data,
            "timestamp": self.redis_timestamp,
            "timeInterval": self.redis_time_interval
        }
        self.redis_connection.set(self.redis_job_data_key, json.dumps(self.redis_job_data))

    # TODO: consider moving this logic into a more general form when the time comes (duplicate logic).
    # Not the same as ThreadIntervalHandler which uses datetime not time. Maybe this should use datetime as well?
    def recalculate_next_job_timestamp(self):
        if self.redis_time_interval is None or self.redis_time_interval <= 0:
            self.redis_time_interval = self.time_interval
        current_timestamp = time.time()
        diff = current_timestamp - self.redis_timestamp
        count = int(diff / self.redis_time_interval)
        if count == 0:
            count = 1
        self.redis_timestamp += self.redis_time_interval * count
        if self.redis_timestamp <= current_timestamp:
            self.redis_timestamp += self.redis_time_interval

    def try_acquire(self):
        self.acquire_fail_code = 0
        if self.acquired:
            return True
        if not self.redis_mutex.try_acquire():
            self.acquire_fail_code = 1
            return False
        self.get_data()
        current_timestamp = time.time()
        if self.redis_timestamp is None:
            self.redis_timestamp = current_timestamp
        if current_timestamp < self.redis_timestamp:
            self.acquire_fail_code = 2
            return False
        self.job_start_timestamp = current_timestamp
        self.acquired = True
        return True

    def release(self):
        if not self.acquired:
            return
        self.recalculate_next_job_timestamp()
        self.set_data()
        self.redis_mutex.release()
        self.acquired = False

    def acquire(self, interval=0.5):
        while not self.try_acquire():
            time.sleep(interval)

    def create(self):
        self.acquire()
        self.release()

    def __enter__(self):
        self.acquire()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()


class RedisStreamSubscriber(object):
    """
    Stream subscriber class, meant to merge subscriptions to redis
    """
    def __init__(self, connection=None):
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.connection = connection
        self.subscription = connection.pubsub()

    def parse_response(self) -> list:
        return self.subscription.parse_response()

    def next_message(self) -> tuple[Optional[bytes], Optional[bytes]]:
        raw_message = self.parse_response()
        if len(raw_message) == 3 and raw_message[0] == b'message':
            return (raw_message[2], raw_message[1])
        return (None, None)

    def get_file_descriptor(self):
        return self.subscription.connection._sock.fileno()

    def subscribe(self, stream_name: str) -> Any:
        """
        Subscribe to a redis stream
        :param stream_name:
        :return: The number of subscription we have active
        """
        return self.subscription.subscribe(stream_name)

    def unsubscribe(self, stream_name: str):
        self.subscription.unsubscribe(stream_name)

    @property
    def num_streams(self) -> int:
        return len(self.subscription.channels)

    def close(self):
        if self.subscription and self.subscription.subscribed:
            self.subscription.unsubscribe()
            self.subscription.reset()


class CachedRedisStreamPublisher(RedisStreamPublisher):
    def __init__(self, stream_name, connection=None, persistence=True, raw=False, expire_time=None):
        super().__init__(stream_name, connection=connection, persistence=persistence, raw=raw, expire_time=expire_time)
        self.store_cache = {}
        self.last_message = {}

    def check_and_update_cache(self, message: Any) -> bool:
        if isinstance(message, str):
            # TODO: we don't support cache for strings right now
            return False
        message = jsonify(message)
        if "objectType" not in message or "objectId" not in message:
            if same_dict(self.last_message, message):
                return True
            else:
                self.last_message = message
                return False
        else:
            cache_key = message["objectType"] + "-" + str(message["objectId"])
            if cache_key in self.store_cache and same_dict(self.store_cache[cache_key], message):
                return True
            else:
                self.store_cache[cache_key] = message
                return False

    def publish(self, message: Any) -> str:
        if self.check_and_update_cache(message):
            return ""
        return super().publish(message)

    def publish_json(self, message: Any) -> str:
        if self.check_and_update_cache(message):
            return ""
        return super().publish_json(message)
