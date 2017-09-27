import redis
from django.contrib.sessions.backends.base import SessionBase, CreateError

from establishment.misc.settings_with_default import SettingsWithDefault

settings = SettingsWithDefault("SESSION_REDIS",
                               HOST="localhost",
                               PORT=6379,
                               SOCKET_TIMEOUT=0.2,
                               RETRY_ON_TIMEOUT=True,
                               DB=0,
                               PASSWORD=None,
                               PREFIX="session",
                               UNIX_DOMAIN_SOCKET_PATH=None,
                               URL=None,
                               POOL=None,
                               SENTINEL_LIST=None,
                               SENTINEL_MASTER_ALIAS=None
                               )


class RedisConnectionType:
    SENTINEL = "sentinel"
    URL = "url"
    HOST = "host"
    UNIX_SOCKET = "unix_socket"


class RedisConnection:
    _redis_cache = {}

    def __init__(self, session_key):
        self.session_key = session_key
        self.connection_key = ""
        self.settings = settings

        if settings.SENTINEL_LIST is not None:
            self.connection_type = RedisConnectionType.SENTINEL
        else:
            if settings.POOL is not None:
                server_key, server = self.get_server(session_key, settings.POOL)
                self.connection_key = str(server_key)
                self.settings = SettingsWithDefault(fallback_settings=settings)

            if settings.URL is not None:
                self.connection_type = RedisConnectionType.URL
            elif settings.HOST is not None:
                self.connection_type = RedisConnectionType.HOST
            elif settings.UNIX_DOMAIN_SOCKET_PATH is not None:
                self.connection_type = RedisConnectionType.UNIX_SOCKET

        self.connection_key += self.connection_type

    @staticmethod
    def get_server(key, servers_pool):
        """
        Assign a redis server pseudo-randomly, proportionally to server weights,
        consistently producing the same result for the same key.
        :param key:
        :param servers_pool:
        :return:
        """
        total_weight = sum([server.get("weight", 1) for server in servers_pool])

        import hashlib
        position = int(hashlib.sha256(key).hexdigest(), 16) % total_weight

        partial_weight_sum = 0
        for server_key, server in enumerate(servers_pool):
            current_weight = server.get("weight", 1)
            if partial_weight_sum <= position < (partial_weight_sum + current_weight):
                return server_key, server
            partial_weight_sum += current_weight

        return server_key, server

    def create_connection(self):
        settings = self.settings

        if self.connection_type == RedisConnectionType.SENTINEL:
            from redis.sentinel import Sentinel
            return Sentinel(
                settings.SENTINEL_LIST,
                socket_timeout=settings.SOCKET_TIMEOUT,
                retry_on_timeout=settings.RETRY_ON_TIMEOUT,
                db=getattr(settings, "db", 0),
                password=getattr(settings, "password", None)
            ).master_for(settings.SENTINEL_MASTER_ALIAS)

        if self.connection_type == RedisConnectionType.URL:
            return redis.StrictRedis.from_url(settings.URL, socket_timeout=settings.SOCKET_TIMEOUT)

        if self.connection_type == RedisConnectionType.HOST:
            return redis.StrictRedis(
                host=settings.HOST,
                port=settings.PORT,
                socket_timeout=settings.SOCKET_TIMEOUT,
                retry_on_timeout=settings.RETRY_ON_TIMEOUT,
                db=settings.DB,
                password=settings.PASSWORD
            )

        if self.connection_type == RedisConnectionType.UNIX_SOCKET:
            return redis.StrictRedis(
                unix_socket_path=settings.UNIX_DOMAIN_SOCKET_PATH,
                socket_timeout=settings.SOCKET_TIMEOUT,
                retry_on_timeout=settings.RETRY_ON_TIMEOUT,
                db=settings.DB,
                password=settings.PASSWORD,
            )

    def get(self):
        if self.connection_key not in self._redis_cache:
            self._redis_cache[self.connection_key] = self.create_connection()

        return self._redis_cache[self.connection_key]


class SessionStore(SessionBase):
    def __init__(self, session_key=None):
        super().__init__(session_key)
        self.server = RedisConnection(session_key).get()

    @classmethod
    def clear_expired(cls):
        # Redis already has expiration built-in
        pass

    def load(self):
        try:
            self._get_or_create_session_key()
            session_data = self.server.get(self.get_redis_key_name())
            return self.decode(session_data)
        except:
            self._session_key = None
            return {}

    def exists(self, session_key=None):
        return self.server.exists(self.get_redis_key_name(session_key))

    def create(self):
        for _ in range(5):
            self._session_key = self._get_new_session_key()

            try:
                self.save(must_create=True)
            except CreateError:
                # Key wasn't unique. Try again.
                continue
            self.modified = True
            return

        raise RuntimeError("Failed to create key")

    def save(self, must_create=False):
        # Make sure the session key exists
        self._get_or_create_session_key()

        if must_create and self.exists(self._get_or_create_session_key()):
            raise CreateError

        data = self.encode(self._get_session(no_load=must_create))

        self.server.setex(self.get_redis_key_name(), self.get_expiry_age(), data)

    def delete(self, session_key=None):
        try:
            self.server.delete(self.get_redis_key_name(session_key))
        except:
            pass

    def get_redis_key_name(self, session_key=None):
        """
        Return the key name in redis, adding the prefix if it exists
        @return string
        """
        session_key = session_key or self._session_key
        prefix = settings.PREFIX and (settings.PREFIX + ":")
        return (prefix or "") + session_key
