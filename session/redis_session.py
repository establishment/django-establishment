import redis
from django.conf import settings as django_settings
from django.contrib.sessions.backends.base import SessionBase, CreateError


class UselessByteWrapper(str):
    def __init__(self, bytes):
        self.bytes = bytes

    def encode(self, encoding, errors=None):
        return self.bytes


class SessionStore(SessionBase):
    def __init__(self, session_key=None):
        super().__init__(session_key)
        self.server = redis.StrictRedis(**django_settings.REDIS_CONNECTION_SESSION)

    @classmethod
    def clear_expired(cls):
        # Redis already has expiration built-in
        pass

    def load(self):
        try:
            self._get_or_create_session_key()
            session_data = self.server.get(self.get_redis_key_name())
            return self.decode(session_data.decode("utf-8"))
        except Exception as e:
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
        prefix = "session:"
        return prefix + session_key
