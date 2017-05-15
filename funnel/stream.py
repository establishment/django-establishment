from django.db import models

# for StreamObjectMixin to_json
from django.db.models.fields.related import ManyToManyRel, RelatedField, OneToOneField
from django.db.models.fields.reverse_related import ForeignObjectRel

from establishment.funnel.redis_stream import RedisStreamPublisher
from establishment.funnel.json_helper import to_camel_case

STREAM_HANDLERS = []


def register_stream_handler(stream_handler):
    STREAM_HANDLERS.append(stream_handler)


def get_stream_handler(stream_name):
    for stream_class in STREAM_HANDLERS:
        if stream_class.matches_stream_name(stream_name):
            return stream_class
    return None


class StreamObjectMixin(models.Model):
    EVENT_PERSISTENCE_DURATION = 24 * 60 * 60  # TODO: lower this!

    class Meta:
        abstract = True

    @classmethod
    def object_type(cls):
        return cls._meta.db_table

    @classmethod
    def should_include_field(cls, meta_field, include, exclude, include_many_to_many):
        # check if this should be there or it shouldn't be
        try:
            name = meta_field.attname
        except:
            name = meta_field.remote_field.attname

        # erase the thing from included, so the second check when including
        # stuff that is not
        if include is not None and name in include:
            include.remove(name)
            return True

        if exclude is not None and name in exclude:
            return False

        # check for many to many
        if type(meta_field.remote_field) is ManyToManyRel:
            return include_many_to_many

        # One to one is mess
        if isinstance(meta_field, OneToOneField):
            return False

        # if it's our stuff, it's ok
        if isinstance(meta_field, RelatedField):
            return True

        # if other people put stuff here, it's not ok
        if isinstance(meta_field, ForeignObjectRel):
            return False

        # no remote_field = basic db stuff. good
        if meta_field.remote_field is None:
            return True

        # something bad happened
        raise Exception

    @classmethod
    def get_key_name(cls, name, rename):
        if rename is not None and name in rename:
            return rename[name]

        return to_camel_case(name)

    @classmethod
    def get_meta_key(cls, meta_field, rename):
        # check if meta_field's a ManyToMany so we can change 'tests' to 'test_ids' for example
        name = meta_field.attname
        if type(meta_field.remote_field) is ManyToManyRel:
            name = name[:-1]
            name += "_ids"

        return cls.get_key_name(name, rename)

    @classmethod
    def get_value(cls, obj, meta_field):
        if type(meta_field.remote_field) is ManyToManyRel:
            ids = list(getattr(obj, meta_field.attname).all().values_list('id', flat=True))

            return ids
        else:
            return getattr(obj, meta_field.attname)

    def meta_to_json(self, include_many_to_many=False, rename=None, exclude=None, include=None, exclude_none=True):
        json_obj = dict()

        # add all fields
        for meta_field in self._meta.get_fields():
            if not self.should_include_field(meta_field, include, exclude, include_many_to_many):
                continue

            value = self.get_value(self, meta_field)

            if exclude_none and (value is None or value == [] or value == {}):
                continue

            json_obj[self.get_meta_key(meta_field, rename)] = self.get_value(self, meta_field)

        # add requested stuff that is not a field
        for name in include or []:
            if name in json_obj:
                continue

            if not hasattr(self, name):
                continue

                # check if the attribute is a function
            if hasattr(getattr(self, name), "__call__"):
                value = getattr(self, name)()
            else:
                value = getattr(self, name)

            if not exclude_none or value:
                json_obj[self.get_key_name(name, rename)] = value

        return json_obj

    def to_json(self):
        return self.meta_to_json()

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
