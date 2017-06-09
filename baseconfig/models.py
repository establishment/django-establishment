import time
from threading import Lock

from django.conf import settings
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


class CommandInstance(StreamObjectMixin):
    name = models.CharField(max_length=255)
    class_instance = models.CharField(max_length=255)

    class Meta:
        db_table = "CommandInstance"

    def instantiate(self, *args, **kwargs):
        cls = self.class_instance
        return cls(*args, **kwargs)


class CommandRunLogger(object):
    def __init__(self, command_run):
        self.command_run = command_run

    # A CommandRunLogger can be
    def __call__(self, *args, **kwargs):
        pass

    def log_message(self, level, timestamp, message):
        self.command_run.log_message({
            "level": level,
            "timestamp": timestamp,
            "message": message,
        })


class CommandRun(StreamObjectMixin):
    EVENT_PERSISTENCE_DURATION = None  # Disable persistence of events

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    command_instance = models.ForeignKey(CommandInstance, on_delete=models.PROTECT)
    date_create = models.DateTimeField(auto_now_add=True)
    date_finished = models.DateTimeField(null=True, blank=True)
    success = models.NullBooleanField()
    result = JSONField(null=True, blank=True)
    log_entries = JSONField(null=True, blank=True)

    class Meta:
        db_table = "CommandRun"

    def get_stream_name(self):
        return "GlobalCommandRuns"

    @classmethod
    def run(cls, user, command_instance, *args, **kwargs):
        command_run = cls(user=user, command_instance=command_instance)
        command_logger = CommandRunLogger(command_run)
        command_run.publish_create_event()
        command = command_instance.instantiate(logger=command_logger)
        command_run.result = command.run_safe(*args, user=user, **kwargs)

    def log(self, message_dict):
        if self.log_entries is None:
            self.log_entries = []
        self.log_entries.append(message_dict)
        self.publish_event("logMessage", message_dict)


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
