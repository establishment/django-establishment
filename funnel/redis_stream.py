import json
import time
import threading

from django.conf import settings
from redis import StrictRedis, ConnectionPool

from establishment.misc.util import jsonify, same_dict
from establishment.misc.threading_helper import ThreadIntervalHandler
from establishment.funnel.encoder import StreamJSONEncoder


redis_connection_pool = None


def redis_response_to_json(data):
    if data is None:
        return None

    try:
        data = str(data, "utf-8")
    except Exception:
        print("Failed to convert Redis string to unicode!")
        return None

    try:
        return json.loads(data)
    except Exception:
        print("Failed to parse Redis string to json " + str(data))
    return None


def redis_response_to_bool(data):
    if data is None:
        return False
    elif data.lower() == "true":
        return True
    return False


def redis_response_to_int(data):
    if data is None:
        return None
    try:
        return int(data)
    except ValueError:
        return 0


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

    def __init__(self, mutex_name, connection=None, expire=30, owner_id=None):
        if not owner_id:
            owner_id = "default_id"
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
        result = self.redis_connection.get(self.redis_mutex_key)
        if result is not None:
            self.acquired = False
            return False
        result = self.redis_connection.getset(self.redis_mutex_key, self.owner_id)
        if result is not None:
            self.redis_connection.set(self.redis_mutex_key, result)
            self.redis_connection.expire(self.redis_mutex_key, self.expire)
            self.acquired = False
            return False
        self.redis_connection.expire(self.redis_mutex_key, self.expire)
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
    @classmethod
    def get_timestamp(cls):
        return int(time.time() * 1000)

    def __init__(self, name, connection=None, time_interval=1000):
        if not connection:
            connection = StrictRedis(connection_pool=get_default_redis_connection_pool())
        self.redis_connection = connection
        self.name = name
        self.redis_mutex_name = "scheduled-job." + self.name
        self.redis_job_data_key = "scheduled-job." + self.name + ".job_data"
        self.redis_timestamp_key = "scheduled-job." + self.name + ".timestamp"
        self.redis_time_interval_key = "scheduler-job." + self.name + ".time_interval"
        self.redis_mutex = RedisMutex(self.redis_mutex_name, connection=connection)
        self.redis_job_data = {}
        self.redis_timestamp = None
        self.redis_time_interval = None
        self.time_interval = time_interval
        self.job_start_timestamp = 0
        self.acquired = False
        self.acquire_fail_code = 0

    def get_field_job_data(self):
        self.redis_job_data = redis_response_to_json(self.redis_connection.get(self.redis_job_data_key))
        if self.redis_job_data is None:
            self.redis_job_data = {}

    def get_field_timestamp(self):
        self.redis_timestamp = redis_response_to_int(self.redis_connection.get(self.redis_timestamp_key))

    def get_field_time_interval(self):
        self.redis_time_interval = redis_response_to_int(self.redis_connection.get(self.redis_time_interval_key))

    def set_field_job_data(self):
        self.redis_connection.set(self.redis_job_data_key, json.dumps(self.redis_job_data))

    def set_field_timestamp(self):
        self.redis_connection.set(self.redis_timestamp_key, str(self.redis_timestamp))

    def set_field_time_interval(self):
        self.redis_connection.set(self.redis_time_interval_key, str(self.redis_time_interval))

    def recalculate_next_job_timestamp(self):
        if self.redis_time_interval is None or self.redis_time_interval <= 0:
            self.redis_time_interval = self.time_interval
        current_timestamp = RedisScheduledJob.get_timestamp()
        diff = current_timestamp - self.redis_timestamp
        count = int(diff / self.redis_time_interval)
        if diff % self.redis_time_interval > 0:
            count += 1
        if count == 0:
            count = 1
        self.redis_timestamp += self.redis_time_interval * count

    def try_acquire(self):
        self.acquire_fail_code = 0
        if self.acquired:
            return True
        if not self.redis_mutex.try_acquire():
            self.acquire_fail_code = 1
            return False
        self.get_field_timestamp()
        current_timestamp = RedisScheduledJob.get_timestamp()
        if self.redis_timestamp is None:
            self.redis_timestamp = current_timestamp
        if current_timestamp < self.redis_timestamp:
            self.acquire_fail_code = 2
            return False
        self.job_start_timestamp = current_timestamp
        self.get_field_job_data()
        self.get_field_time_interval()
        self.acquired = True
        return True

    def release(self):
        if not self.acquired:
            return
        self.recalculate_next_job_timestamp()
        self.set_field_time_interval()
        self.set_field_timestamp()
        self.set_field_job_data()
        self.redis_mutex.release()
        self.acquired = False

    def acquire(self, interval=0.5):
        while not self.try_acquire():
            time.sleep(interval)

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
