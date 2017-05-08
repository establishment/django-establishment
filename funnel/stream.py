from django.db import models

from establishment.funnel.redis_stream import RedisStreamPublisher

STREAM_HANDLERS = []


def register_stream_handler(stream_handler):
    STREAM_HANDLERS.append(stream_handler)


def get_stream_handler(stream_name):
    for stream_class in STREAM_HANDLERS:
        if stream_class.matches_stream_name(stream_name):
            return stream_class
    return None


class StreamObjectMixin(models.Model):
    EVENT_PERSISTENCE_DURATION = 24 * 60 * 60 # TODO: lower this!

    class Meta:
        abstract = True

    @classmethod
    def object_type(cls):
        return cls._meta.db_table

    def to_json(self, fields=None, exclude=None):
        # Iterate over all fields (if None, use all own fields)
        # Remove any value in exclude
        # cameCase all field names
        # all_fields = self._meta.get_fields()
        # for field in all_fields:
        #     pass
        return {
            "id": self.id
        }

    def make_event(self, event_type, data, extra=None):
        event_dict = {
            "objectId": self.id,
            "objectType": self.object_type(),
            "type": event_type,
            "data": data,
        }
        if extra:
            event_dict.update(extra)
        return event_dict

    def make_create_event(self, *args, **kwargs):
        return self.make_event("create", self, *args, **kwargs)

    def make_update_event(self, *args, **kwargs):
        return self.make_event("update", self, *args, **kwargs)

    def make_delete_event(self, *args, **kwargs):
        data = kwargs.pop("data", {})
        return self.make_event("delete", data, *args, **kwargs)

    def publish_event(self, event_type, data, extra=None, stream_names=None, persistence=True, expire_time=EVENT_PERSISTENCE_DURATION):
        event = self.make_event(event_type, data, extra)
        self.publish_event_raw(event, stream_names, persistence, expire_time)
        return event

    def publish_create_event(self, *args, **kwargs):
        self.publish_event("create", self, *args, **kwargs)

    def publish_update_event(self, *args, **kwargs):
        self.publish_event("updateOrCreate", self, *args, **kwargs)

    def publish_delete_event(self, *args, **kwargs):
        self.publish_event("delete", {}, *args, **kwargs)

    def delete_and_make_event(self, *args, **kwargs):
        event = self.make_delete_event(*args, **kwargs)
        self.delete()
        return event

    def delete_and_publish_event(self, *args, **kwargs):
        event = self.delete_and_make_event()
        return self.publish_event_raw(event, *args, **kwargs)

    def publish_event_raw(self, event, stream_names=None, persistence=True, expire_time=EVENT_PERSISTENCE_DURATION):
        """
        Method that can be used to publish any event on the objects' stream
        """
        if not stream_names:
            stream_names = self.get_stream_name()
        if not isinstance(stream_names, list):
            stream_names = [stream_names]
        for stream_name in stream_names:
            RedisStreamPublisher.publish_to_stream(stream_name, event, persistence=persistence, expire_time=expire_time)

    def add_to_state(self, state, user=None):
        state.add(self)
