import time
import uuid

from redis import StrictRedis
from django.conf import settings

redis_connection = StrictRedis(**settings.REDIS_CONNECTION)

# Atomic sliding-window check-and-increment. Done in a single Lua eval because the previous
# read-then-write sequence raced: concurrent requests each saw the count under the limit and all
# pushed, so the limit was bypassable (and the key never got an expiry, so it leaked). ZSET scored
# by timestamp; stale members are trimmed, then we admit only if under the limit.
SLIDING_WINDOW_LUA = """
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local just_check = tonumber(ARGV[4])
local member = ARGV[5]
-- A prior version of this throttler stored a LIST here with no TTL. Drop any leftover
-- non-ZSET key so the LIST->ZSET switch self-heals instead of erroring WRONGTYPE forever.
if redis.call('EXISTS', key) == 1 and redis.call('TYPE', key).ok ~= 'zset' then
    redis.call('DEL', key)
end
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
    return 0
end
if just_check == 0 then
    redis.call('ZADD', key, now, member)
    redis.call('PEXPIRE', key, math.ceil(window * 1000))
end
return 1
"""
sliding_window_check = redis_connection.register_script(SLIDING_WINDOW_LUA)


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

    def single_increm(self) -> bool:
        if redis_connection.set(self.key_name, "true", self.timeframe, nx=True):
            return True
        return False

    def increm(self, just_check=False):
        if self.limit == 1:
            return self.single_increm()

        now = time.time()
        member = f"{now}:{uuid.uuid4().hex}"
        allowed = sliding_window_check(
            keys=[self.key_name],
            args=[now, self.timeframe, self.limit, 1 if just_check else 0, member],
        )
        return bool(allowed)

    def increm_or_raise(self, error):
        if not self.increm():
            raise error

    def clear(self):
        redis_connection.delete(self.key_name)

    @classmethod  # type: ignore[no-redef]
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
