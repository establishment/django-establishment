import time
import uuid
from enum import Enum
from typing import Union, Optional, Any

import redis.lock
from django.conf import settings

from utils.logging import logger

throttling_redis_client = redis.Redis.from_url(settings.RATE_LIMITER_REDIS_URL)
BUCKET_KEY_FORMAT = "throttle-{scope}-{duration}-{identity}-{timestamp}"  # TODO @cleanup rename this field


def parse_rate(rate: str) -> tuple[int, int]:
    num, period = rate.split("/")
    num_requests = int(num)
    # Good enough for now: just add any needed period here. Will implement well some other time
    allowed_periods = {
        "s": 1,
        "optsecunde": 8,
        "m": 60,
        "5m": 5 * 60,
        "15m": 15 * 60,
        "h": 60 * 60,
        "d": 24 * 60 * 60,
    }
    duration = allowed_periods[period]
    return num_requests, duration


class Throttle(Enum):
    HEAVY_USE = "10/s"
    DEFAULT = "20/optsecunde,100/m"
    ADMIN = "200/m"
    RARE = "20/5m,60/15m"
    VERY_RARE = "5/h"
    EXTERNAL_APP = "30/s"  # Meant only for communication with other apps, not for users
    INTERNAL_APP = "100/s"  # Only for internal apps (websocket authentication for now)

    def __init__(self, rates: Union[str, list[tuple[int, int]]], scope: Optional[str] = None):
        self.init(rates, scope)

    def init(self, rates: Union[str, list[tuple[int, int]]], scope: Optional[str] = None):
        if not isinstance(rates, list):
            rates_list: list[tuple[int, int]] = []
            for rate in rates.split(","):
                rates_list.append(parse_rate(rate))
            rates = rates_list
        self.rates = rates
        self.scope = scope or self.name or str(rates)

    def throttle_request(self, identity: str) -> bool:
        timestamp = int(time.time())
        for max_num_requests, duration in self.rates:
            bucket_key = BUCKET_KEY_FORMAT.format(
                scope=self.scope,
                duration=duration,
                identity=identity,
                timestamp=int(timestamp / duration) * duration,  # The start of the window
            )

            try:
                multi = throttling_redis_client.pipeline()
                multi.incr(bucket_key)
                multi.expire(bucket_key, duration)
                num_requests = multi.execute()[0]
            except Exception as e:
                # TODO: this error should probably be silently throttled if our Redis server ever dies :)
                # TODO: so if we ever lose our Redis every request is rejected because of throttling?
                logger.error("Failed to update throttle bucket {}: {}".format(bucket_key, str(e)))
                return False

            if num_requests > max_num_requests:
                return True

        return False

    def to_json(self) -> dict[str, Any]:
        return {
            "scope": self.scope,
            "rates": [{"duration": duration, "count": count} for count, duration in self.rates]
        }


# TODO: this shouldn't be completely independent of the method above
class ActionThrottler:
    def should_throttle(self, owner: str, action: str, rate: str) -> bool:
        if settings.DISABLE_THROTTLING:
            return False

        key = self.compute_key(owner, action)
        max_count, duration = parse_rate(rate)
        timestamp = int(time.time())

        try:
            with self.lock(key):
                throttling_redis_client.zremrangebyscore(key, "-inf", timestamp - duration)
                if throttling_redis_client.zcard(key) >= max_count:
                    return True
                p = throttling_redis_client.pipeline()
                p.zadd(key, {uuid.uuid4().hex: timestamp}, nx=True)
                p.expire(key, duration)
                p.execute()
        except Exception as e:
            logger.error(f"Failed to update throttle key {key}", exc_info=e)

        return False

    def reset_throttle(self, owner: str, action: str):
        key = self.compute_key(owner, action)
        try:
            with self.lock(key):
                throttling_redis_client.delete(key)
        except Exception as e:
            logger.error(f"Failed to delete key {key}", exc_info=e)

    def lock(self, key: str) -> redis.lock.Lock:
        return throttling_redis_client.lock(f"{key}-lock", timeout=2, blocking_timeout=2)

    def compute_key(self, owner: str, action: str) -> str:
        return f"action-throttle-{action}-{owner}"


class InMemoryThrottle:
    def __init__(self, interval: float):
        self.interval = interval
        self.last_timestamp = time.time()

    def execute(self) -> bool:
        now = time.time()
        if now - self.last_timestamp >= self.interval:
            self.last_timestamp = now
            return True
        return False
