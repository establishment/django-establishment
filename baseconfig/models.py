import time
import importlib
from threading import Lock

from django.conf import settings
from django.db import models
from django.utils import timezone
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
    name = models.CharField(max_length=255, unique=True)
    prompt_for_confirmation = models.BooleanField(default=False)
    class_instance = models.CharField(max_length=255, unique=True)
    # arguments = JSONField(null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "CommandInstance"

    def instantiate(self, *args, **kwargs):
        class_path, class_name = self.class_instance.rsplit('.', 1)
        cls = getattr(importlib.import_module(class_path), class_name)
        return cls(*args, **kwargs)


class CommandRunLogger(object):
    def __init__(self, command_run):
        self.command_run = command_run

    # A CommandRunLogger can be
    def __call__(self, *args, **kwargs):
        self.log_message("info", time.time(), ' '.join([str(arg) for arg in args]))

    def log_message(self, level, timestamp, message):
        self.command_run.log({
            "level": level,
            "timestamp": timestamp,
            "message": message,
        })

    def set_progress(self, percent, progress_dict=None):
        data = {
            "percent": percent
        }
        data.update(progress_dict or {})
        self.command_run.set_progress(data)

    def exception(self, exception):
        self.log_message("error", time.time(), exception)


class CommandRun(StreamObjectMixin):
    COMMAND_RUN_STATUS = (
        (0, "Waiting"),
        (1, "Running"),
        (2, "Successful"),
        (3, "Failed")
    )

    EVENT_PERSISTENCE_DURATION = None  # Disable persistence of events

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    command_instance = models.ForeignKey(CommandInstance, on_delete=models.PROTECT)
    date_created = models.DateTimeField(auto_now_add=True)
    date_finished = models.DateTimeField(null=True, blank=True)
    status = models.IntegerField(choices=COMMAND_RUN_STATUS, default=0)
    result = JSONField(null=True, blank=True)
    log_entries = JSONField(null=True, blank=True)

    class Meta:
        db_table = "CommandRun"

    def get_stream_name(self):
        return "GlobalCommandRuns"

    @classmethod
    def run(cls, user, command_instance, *args, **kwargs):
        # Creating the command
        command_run = cls(user=user, command_instance=command_instance)
        command_run.save()
        command_logger = CommandRunLogger(command_run)
        command_run.publish_create_event()

        # Running the command

        # Setting the command in "running" status
        command = command_instance.instantiate(logger=command_logger)
        command_run.date_created = timezone.now()
        command_run.status = 1
        command_run.publish_update_event()
        command_run.save()

        command_run.result = command.run_safe(*args, **kwargs)

        # Setting the command in either "failed" or "succeeded" status
        command_run.status = 3 if command.had_exception else 2
        command_run.date_finished = timezone.now()
        command_run.publish_update_event()
        command_run.save()

        return command_run

    def log(self, message_dict):
        if self.log_entries is None:
            self.log_entries = {
                "entries": [],
                "progress": {}
            }
        self.log_entries["entries"].append(message_dict)
        self.publish_event("logMessage", message_dict)

    def set_progress(self, progress_dict):
        if self.log_entries is None:
            self.log_entries = {
                "entries": [],
                "progress": {}
            }
        self.log_entries["progress"] = progress_dict
        self.publish_event("logProgress", progress_dict)


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
            self.last_refresh = current_time

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
