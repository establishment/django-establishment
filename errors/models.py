import copy

from django.db import models

from establishment.funnel.stream import StreamObjectMixin


class ErrorMessage(StreamObjectMixin, Exception):
    is_public = models.BooleanField("Should be seen by non-admins", default=True)
    message = models.CharField(max_length=2048, null=True, blank=True)
    translation_key = models.OneToOneField("localization.TranslationKey", on_delete=models.SET_NULL, null=True, blank=True)
    status_code = models.IntegerField("HTTP Status code", null=True, blank=True)
    app = models.CharField("Django app", max_length=64, null=True, blank=True)

    cache = None
    message_cache = None

    class Meta:
        db_table = "ErrorMessage"
        unique_together = (("message", "app"), )

    def __init__(self, *args, **kwargs):
        self.is_from_db = kwargs.pop("is_from_db", True)
        super().__init__(*args, **kwargs)

    def __str__(self):
        value = "ErrorMessage " + str(self.id) + " " + self.message
        if not self.is_public:
            value += " [Admin]"
        return value

    def save(self, *args, **kwargs):
        if not self.is_from_db:
            raise RuntimeError("Can't save error not meant for DB")
        super().save(*args, **kwargs)

    @classmethod
    def add_to_cache(cls, error_message):
        cls.cache[error_message.id] = error_message
        cls.message_cache[(error_message.app, error_message.message)] = error_message

    @classmethod
    def build_cache(cls):
        cls.cache = dict()
        cls.message_cache = dict()
        all_objects = cls.objects.all().prefetch_related("translation_key")
        for obj in all_objects:
            cls.add_to_cache(obj)

    @classmethod
    def ensure_cache_build(cls):
        if not cls.cache:
            cls.build_cache()

    @classmethod
    def get(cls, id):
        cls.ensure_cache_build()
        return cls.cache[id]

    @classmethod
    def get_or_create(cls, **kwargs):
        cls.ensure_cache_build()
        message = kwargs.get("message")
        app = kwargs.get("app")
        key = (app, message)
        if key in cls.message_cache:
            return cls.message_cache[key]

        error_message = cls(**kwargs)
        error_message.save()
        # TODO: create translation key, may need to import locally
        cls.add_to_cache(error_message)
        return error_message

    def with_extra(self, extra):
        error_message = copy.copy(self)
        error_message.extra = extra
        return error_message

    def to_response(self, extra=None, **kwargs):
        from establishment.webapp.base_views import JSONResponse

        response = {
            "error": self.to_json(),
        }
        if extra:
            response.update(extra)
        response["error"].update(getattr(self, "extra", {}))
        if self.status_code:
            kwargs["status"] = self.status_code
        return JSONResponse(response, **kwargs)

    def to_json(self):
        result = {
            "id": self.id,
            "message": self.message,
            "statusCode": self.status_code,
        }
        if self.translation_key_id:
            result["translationKeyId"] = self.translation_key_id

        return result


def get_fake_error(**kwargs):
    kwargs["is_from_db"] = False
    return ErrorMessage(**kwargs)


def get_error(**kwargs):
    kwargs.pop("_state", True)
    if not ErrorMessage.cache:
        return get_fake_error(**kwargs)

    try:
        # First try to get existing error message instance
        id = kwargs.get("id")
        if id and id in ErrorMessage.cache:
            return ErrorMessage.get(id)
        kwargs.pop("id", True)
        return ErrorMessage.get_or_create(**kwargs)
    except:
        # If there's an issue with the DB, just use temporary objects
        return get_fake_error(**kwargs)
