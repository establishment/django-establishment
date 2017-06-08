import time
from threading import Lock

from django.db import models
from django.contrib.postgres.fields import JSONField

from establishment.funnel.stream import StreamObjectMixin


class BaseGlobalSettings(StreamObjectMixin):
    namespace = models.CharField(max_length=255, null=True, blank=True)
    key = models.CharField(max_length=255)
    value = JSONField()

    class Meta:
        abstract = True
        unique_together = (("namespace", "key"), )

    @classmethod
    def set(cls, key, value, namespace=None):
        setting, created = cls.objects.get_or_create(key=key, namespace=namespace, defaults={"value": value})
        if created:
            setting.set_value(value)

    def set_value(self, value):
        self.value = value
        self.save(update_fields=["value"])


class PrivateGlobalSettings(BaseGlobalSettings):
    class Meta:
        db_table = "PrivateGlobalSettings"


class PublicGlobalSettings(BaseGlobalSettings):
    class Meta:
        db_table = "PublicGlobalSettings"


class GlobalSettingsCache(object):
    def __init__(self, GlobalSettingsClass, namespace=None, expiration=None):
        self.GlobalSettingsClass = GlobalSettingsClass
        self.namespace = namespace
        self.expiration = expiration
        self.cache = dict()
        self.last_refresh = None
        self.lock = Lock()

    def rebuild(self):
        global_settings = list(self.GlobalSettingsClass.objects.filter(namespace=self.namespace))
        with self.lock:
            self.cache = dict()
            for global_setting in global_settings:
                self.cache[global_setting.key] = global_setting

    def rebuild_if_needed(self):
        current_time = time.time()
        if self.last_refresh is None or (self.expiration and self.last_refresh + self.expiration <= current_time):
            self.rebuild()

    def to_dict(self):
        self.rebuild_if_needed()
        with self.lock:
            rez = dict()
            for key, global_setting in self.cache.items():
                rez[key] = global_setting.value

    def has_key(self, key):
        self.rebuild_if_needed()
        with self.lock:
            return key in self.cache

    def get_raw(self, key):
        with self.lock:
            return self.cache[key]

    def get(self, key, default=None):
        self.rebuild_if_needed()

        if default is not None and not self.has_key(key):
            return default

        return self.get_raw(key).value


class PublicSettingsCache(GlobalSettingsCache):
    def __init__(self, *args, **kwargs):
        super().__init__(PublicGlobalSettings, *args, **kwargs)


class PrivateSettingsCache(GlobalSettingsCache):
    def __init__(self, *args, **kwargs):
        super().__init__(PrivateGlobalSettings, *args, **kwargs)
