import json

import django
from django.db import models

from django.db.models.fields.related import ManyToManyRel, RelatedField, OneToOneField
from django.db.models.fields.reverse_related import ForeignObjectRel

from .redis_stream import RedisStreamPublisher
from .json_helper import to_camel_case
from .base_views import JSONResponse, JSONErrorResponse
from .utils import GlobalObjectCache, int_list

import json
import datetime

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
    def should_include_field(cls, meta_field, include = None, exclude = None, include_many_to_many = False):
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
            return True

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
        name = meta_field.name
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

    @classmethod
    def set_value(cls, obj, meta_field, json_value):
        if type(meta_field.remote_field) is ManyToManyRel:
            raise RuntimeError("Implement")

        # returns true if the field was modified
        if meta_field.name == "id":
            return False

        # a meta_field is concrete if it was defined in the model (it's not related to the model)
        if not meta_field.concrete:
            return False

        if meta_field.remote_field:
            # check if we should change the id
            new_id = int(json_value)
            my_id = getattr(obj, meta_field.name + "_id")

            if my_id == new_id:
                return False

            # TODO - here change the id, somehow.
            #   maybe just set field_id to the new id and it will be ok
            return False

        internal_type = str(meta_field.get_internal_type())
        if internal_type == "DateTimeField":
            # TODO - it seems that when converting the unix time to datetime. it will always see that they're different
            #   maybe do not use == when comparing to see if the object needs an update
            #   also, maybe this might help
            # RuntimeWarning: DateTimeField Contest.start_date received a naive datetime (2017-05-09 12:00:00) while time zone support is active

            new_value = datetime.datetime.fromtimestamp(float(json_value))
        elif internal_type == "BooleanField":
            # TODO fix this - in the request is true/false not True/False so to_python fails. Expects True/False/1/0
            if json_value == "true":
                new_value = True
            elif json_value == "false":
                new_value = False
            else:
                new_value = meta_field.to_python(json_value)
        else:
            new_value = meta_field.to_python(json_value)

        # check if an update is really needed
        current_value = getattr(obj, meta_field.name)
        if current_value != new_value:
            setattr(obj, meta_field.name, new_value)
            return True

        return False

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

            # Check if the attribute is a function
            if hasattr(getattr(self, name), "__call__"):
                value = getattr(self, name)()
            else:
                value = getattr(self, name)

            if not exclude_none or value:
                json_obj[self.get_key_name(name, rename)] = value

        return json_obj

    def to_json(self):
        return self.meta_to_json()

    def update_field_from_json_dict(self, meta_field, json_dict, rename=None):
        key = self.get_meta_key(meta_field, rename)
        if key in json_dict:
            old_value = getattr(self, meta_field.name)  # debug purpose
            if self.set_value(self, meta_field, json_dict[key]):
                new_value = getattr(self, meta_field.name)  # debug purpose
                print("edited ", meta_field.name, 'old value:', old_value, "new value:", new_value)  # debug purpose
                return True

        return False

    def update_from_json_dict(self, json_dict, rename=None):
        updated_fields = []

        for meta_field in self._meta.get_fields():
            if self.update_field_from_json_dict(meta_field, json_dict, rename):
                # key = self.get_meta_key(meta_field, rename)
                key = meta_field.name  # I think it's better to return the fields that were updated (in undersore case)
                updated_fields.append(key)

        return updated_fields

    @classmethod
    def get_object_from_edit_request(cls, request, rename=None):
        if rename is not None and "id" in rename:
            return cls.objects.get(id=request.POST[rename["id"]])
        return cls.objects.get(id=request.POST["id"])

    def can_be_edited_by_request(self, request):
        return self.can_be_edited_by_user(request.user)

    def can_be_edited_by_user(self, user):
        if user.is_superuser:
            return True
        return getattr(self, "owner_id", -1) == user.id

    @classmethod
    def edit_from_request(cls, request, rename=None):
        obj = cls.get_object_from_edit_request(request, rename)
        if not obj.can_be_edited_by_request(request):
            from establishment.errors.errors import BaseError
            raise BaseError.NOT_ALLOWED

        updated_fields = obj.update_from_json_dict(request.POST, rename)

        if len(updated_fields):
            # TODO: have a better validation flow
            obj.full_clean()
            obj.save(update_fields=updated_fields)
        return obj, len(updated_fields) > 0

    @classmethod
    def edit_view(cls, decorators=[]):
        def view_func(request):
            obj, modified = cls.edit_from_request(request)
            return JSONResponse({"success": True})

        for decorator in reversed(decorators):
            view_func = decorator(view_func)

        return view_func

    @classmethod
    def create_from_request(cls, request):
        obj = cls()
        obj.update_from_json_dict(request.POST)
        if not obj.can_be_created_by_request(request):
            from establishment.errors.errors import BaseError
            raise BaseError.NOT_ALLOWED
        obj.full_clean()
        return obj

    @classmethod
    def create_view(cls, decorators=[]):
        def view_func(request):
            obj = cls.create_from_request(request)
            obj.save()
            return JSONResponse({"obj": obj})

        for decorator in reversed(decorators):
            view_func = decorator(view_func)

        return view_func

    @classmethod
    def fetch_view(cls, decorators=None, permission_filter=None, max_ids=256):
        def view_func(request):
            ids = int_list(request.GET.getlist("ids[]"))
            if len(ids) > max_ids:
                # TODO: log this, may need to ban some asshole
                return JSONErrorResponse("Requesting too many objects")
            state = GlobalObjectCache(request)
            for obj in cls.objects.get(id__in=ids):
                if not permission_filter or permission_filter(obj):
                    state.add(obj)
            return JSONResponse(state)

        return view_func

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
