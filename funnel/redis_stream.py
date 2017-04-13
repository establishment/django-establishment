import json

from django.conf import settings
from redis import StrictRedis, ConnectionPool

from establishment.detoate.util import jsonify, same_dict
from establishment.funnel.encoder import StreamJSONEncoder


redis_connection_pool = None

def get_default_redis_connection_pool():
    global redis_connection_pool
    if redis_connection_pool is None:
        redis_connection_pool = ConnectionPool(**settings.REDIS_CONNECTION)
    return redis_connection_pool

class RedisStreamPublisher(object):
    message_timeout = 60 * 60 * 5   # Default expire time - 5 hours

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
    def publish_to_stream(cls, stream_name, message, serializer_class=StreamJSONEncoder,
                          connection=None, persistence=True, raw=False, expire_time=None):
        if connection is None:
            connection = get_default_redis_connection_pool()
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
