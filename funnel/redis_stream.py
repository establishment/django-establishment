import json
import time
import threading

from django.conf import settings
from psycopg2.extensions import JSON
from redis import StrictRedis, ConnectionPool

from establishment.misc.util import jsonify, same_dict
from establishment.misc.threading_helper import ThreadIntervalHandler
from establishment.funnel.encoder import StreamJSONEncoder


redis_connection_pool = None


def redis_response_to_json(data):
    if data is None:
        return None

    if isinstance(data, bytes):
        data = str(data, "utf-8")

    return json.loads(data)


def get_default_redis_connection_pool():
    global redis_connection_pool
    if redis_connection_pool is None:
        redis_connection_pool = ConnectionPool(**settings.REDIS_CONNECTION)
    return redis_connection_pool


class RedisStreamPublisher(object):
    message_timeout = 60 * 60 * 5   # Default expire time - 5 hours
    global_connection = None

    def __init__(self, stream_name, connection=None, persistence=True, raw=False, expire_time=None):
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.connection = connection
        self.name = stream_name
        self.persistence = persistence
        self.raw = raw
        if expire_time is not None:
            self.expire_time = expire_time
        else:
            self.expire_time = RedisStreamPublisher.message_timeout
        # TODO: create the publish connection here

    def publish(self, message):
        return RedisStreamPublisher.publish_to_stream(self.name, message, connection=self.connection,
                                                      persistence=self.persistence, raw=self.raw,
                                                      expire_time=self.expire_time)

    def publish_json(self, message):
        return RedisStreamPublisher.publish_to_stream(self.name, message, connection=self.connection,
                                                      persistence=self.persistence, raw=self.raw,
                                                      expire_time=self.expire_time)

    @classmethod
    def get_global_connection(cls):
        if cls.global_connection is None:
            cls.global_connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        return cls.global_connection

    @classmethod
    def publish_to_stream(cls, stream_name, message, serializer_class=StreamJSONEncoder,
                          connection=None, persistence=True, raw=False, expire_time=None):
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
        connection.publish(stream_name, message)
        return original_message

    @classmethod
    def get_stream_id_counter(cls, stream_name):
        return "meta-" + stream_name + "-id-counter"

    @classmethod
    def get_stream_message_id_prefix(cls, stream_name):
        return "meta-" + stream_name + "-msg-id-"

    @classmethod
    def format_message_with_id(cls, message, message_id):
        return "i " + str(message_id) + " " + message

    @classmethod
    def format_message_vanilla(cls, message):
        return "v " + message


class RedisCache(object):
    connection_pool = None

    def __init__(self, key_prefix="cache-", redis_connection=None):
        self.key_prefix = key_prefix
        self.redis_connection = redis_connection or StrictRedis(connection_pool=self.get_default_connection_pool())

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

    def update_key(self, key, generator, timeout, stale_extra=None):
        value = generator()
        serialized_value = self.serialize(value)
        self.redis_connection.setex(key, timeout, serialized_value)
        if stale_extra:
            self.redis_connection.setex("stale-" + key, int(timeout + stale_extra), serialized_value)
        self.redis_connection.delete("lock-" + key)
        # Returning the deserialized value to be consistent between calls of cached/uncached values
        return self.deserialize(serialized_value)

    def get_or_set(self, key, generator, timeout, stale_extra=None, retries_per_second=50):
        if stale_extra is None:
            stale_extra = min(timeout, max(1, timeout // 5))
        key = key or generator.__name__
        if self.key_prefix:
            key = self.key_prefix + key
        value = self.redis_connection.get(key)
        if value:
            return self.deserialize(value)

        # We want to sync so that only a single process calls the generator
        # and the others wait at most stale_extra to grab it
        if stale_extra:
            lock_key = "lock-" + key
            stale_key = "stale-" + key
            lock_status = self.redis_connection.getset(lock_key, str(time.time()))
            if lock_status is None:
                # We grabbed the lock, put the stale copy so that all other readers use it
                stale_value = self.redis_connection.get(stale_key)
                if stale_value:
                    if self.redis_connection.setnx(key, stale_value) == 1:
                        self.redis_connection.expire(key, stale_extra)
                return self.update_key(key, generator, timeout, stale_extra)

        value = self.redis_connection.get("stale-" + key)
        if value:
            return self.deserialize(value)
        else:
            # We didn't have the lock, retry for a while, waiting for
            for _ in range(int(stale_extra * retries_per_second)):
                time.sleep(1.0 / retries_per_second)
                value = self.redis_connection.get(key)
                if value:
                    return self.deserialize(value)
            return self.update_key(key, generator, timeout, stale_extra)


class RedisCacheSerialized(RedisCache):
    @staticmethod
    def deserialize(value):
        if isinstance(value, bytes):
            value = str(value, "utf-8")
        return value


def serialize_arguments(*args, **kwargs):
    def serialize(value):
        if hasattr(value, "id"):
            return value.__class__.__name__ + str(value.id)
        else:
            return value.__repr__()

    args_serialized = [serialize(arg) for arg in args]
    kwargs_serialized = [key + "=" + serialize(kwargs[key]) for key in sorted(kwargs.keys())]

    return ",".join(args_serialized + kwargs_serialized)


def redis_cached(expiration, *cache_args, **cache_kwargs):
    def _decorator(func):
        def _wrapped_call(*func_args, **func_kwargs):
            redis_cache = RedisCache()
            key_name = func.__name__ + ":" + serialize_arguments(*func_args, **func_kwargs)
            return redis_cache.get_or_set(key_name, func, expiration, *cache_args, **cache_kwargs)
        return _wrapped_call

    return _decorator


class RedisPriorityQueue(object):
    def __init__(self, name, **connection_info):
        self.name = name
        self.redis_connection = StrictRedis(**connection_info)

    def push(self, score, value):
        """
        Adds the string 'value' in queue with priority 'score'
        :return: true if the element was added and false if it already exists
        """
        return self.redis_connection.zadd(self.name, score, value) == 1

    def pop(self):
        """
        Removes the first element in queue
        :return: true if an element was removed, false if the queue was empty
        """
        return len(self.redis_connection.zremrangebyrank(self.name, 0, 0)) > 0

    def get(self):
        """
        :return: the first element in queue or None if the queue is empty
        """
        result = self.redis_connection.zrange(self.name, 0, 0)
        if len(result) > 0:
            return result[0]
        else:
            return None

    def get_and_pop(self):
        """
        Gets the first element in queue and removes it
        :return: the first element in queue or None if the queue was empty
        """
        pipeline = self.redis_connection.pipeline(transaction=True)
        pipeline.zrange(self.name, 0, 0)
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
    acquired_mutexes = set()

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
        self.redis_mutex_key = "redis-mutex." + self.mutex_name
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

    def parse_response(self):
        return self.subscription.parse_response()

    def next_message(self):
        raw_message = self.parse_response()
        if len(raw_message) == 3 and raw_message[0] == b'message':
            return (raw_message[2], raw_message[1])
        return (None, None)

    def get_file_descriptor(self):
        return self.subscription.connection._sock.fileno()

    def subscribe(self, stream_name):
        """
        Subscribe to a redis stream
        :param stream_name:
        :return: The number of subscription we have active
        """
        return self.subscription.subscribe(stream_name)

    def unsubscribe(self, stream_name):
        self.subscription.unsubscribe(stream_name)

    @property
    def num_streams(self):
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

    def check_and_update_cache(self, message):
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

    def publish(self, message):
        if self.check_and_update_cache(message):
            return True
        return super().publish(message)

    def publish_json(self, message):
        if self.check_and_update_cache(message):
            return True
        return super().publish_json(message)
