from redis import StrictRedis
import time
from django.conf import settings

redis_connection = StrictRedis(**settings.REDIS_CONNECTION)


class ActionThrottler(object):
    """
    Class to support a generic way of throttling user generated action inside our system
    """
    # TODO: support multiple filters and multiple timeframes
    def __init__(self, name, timeframe, limit):
        """
        :param name: The global name of the action (ex. user-<userId>-change-profile)
        :param timeframe: The rolling window in seconds
        :param max_requests: The maximum number of request to accept in this window
        """
        self.key_name = "throttle-" + name
        self.timeframe = timeframe
        self.limit = limit

    def single_increm(self):
        if redis_connection.set(self.key_name, "true", self.timeframe, nx=True):
            return True
        return False

    def increm(self, just_check=False):
        if self.limit == 1:
            return self.single_increm()

        # TODO: this is a shitty implementation, works for now
        first = redis_connection.lindex(self.key_name, 0)

        # TODO: if length < limit, stop after a few pops
        while first and float(first) + self.timeframe < time.time():
            redis_connection.lpop(self.key_name)
            first = redis_connection.lindex(self.key_name, 0)

        if redis_connection.llen(self.key_name) >= self.limit:
            return False

        if just_check:
            return True

        redis_connection.rpush(self.key_name, str(time.time()))
        # TODO: set expire to self.key_name in timeframe
        return True

    def increm_or_raise(self, error):
        if not self.increm():
            raise error

    def clear(self):
        redis_connection.delete(self.key_name)

    @classmethod
    def increm_or_raise(cls, error, timeframe, limit):
        cls(error.__name__, timeframe, limit).increm_or_raise()


class UserActionThrottler(ActionThrottler):
    def __init__(self, user, name, timeframe, limit):
        user_id = user if isinstance(user, int) else user.id

        super().__init__("user-" + str(user_id) + "-" + name, timeframe, limit)

    @classmethod
    def increm_or_raise(cls, error, user, timeframe, limit):
        cls(user, error.__name__, timeframe, limit)

# TODO: include visitor_throttle and user_throttle(error, time, limit) as decorators for views
