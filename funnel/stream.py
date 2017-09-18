import datetime

from django.db import models
from django.db.models.fields.related import ManyToManyRel, RelatedField, OneToOneField
from django.db.models.fields.reverse_related import ForeignObjectRel

from establishment.webapp.state import State, int_list
from .json_helper import to_camel_case, to_json_dict
from .redis_stream import RedisStreamPublisher

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

    def has_field(self, field_name):
        return field_name in map(lambda field: field.name, self._meta.get_fields())

    @classmethod
    def object_type(cls):
        return cls._meta.db_table

    @classmethod
    def should_include_field(cls, meta_field, include=None, exclude=None, include_many_to_many=False):
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
    def get_object_key_from_meta_field(cls, meta_field):
        name = meta_field.name
        if type(meta_field.remote_field) is ManyToManyRel:
            name = name[:-1]
            name += "_ids"
        elif meta_field.remote_field:
            name += "_id"
        return name

    @classmethod
    def get_meta_key(cls, meta_field, rename):
        return cls.get_key_name(cls.get_object_key_from_meta_field(meta_field), rename)

    def get_field_value(self, meta_field):
        if type(meta_field.remote_field) is ManyToManyRel:
            rel_queryset = getattr(self, meta_field.attname)
            try:
                # this is actually the only way objects might have been pre-fetched (Django 1.11)
                self._prefetched_objects_cache[rel_queryset.prefetch_cache_name]
                # Ok, it's pefetched
                ids = list(map(lambda obj: obj.id, rel_queryset.all()))
            except (AttributeError, KeyError):
                # Not prefetched
                ids = list(rel_queryset.all().values_list("id", flat=True))
            return ids
        else:
            return getattr(self, meta_field.attname)

    # returns True if the field was modified
    def set_field_value(self, meta_field, json_value):
        field_name = self.__class__.get_object_key_from_meta_field(meta_field)
        if field_name == "id":
            return False

        # a meta_field is concrete if it was defined in the model (it's not related to the model)
        if not meta_field.concrete:
            raise RuntimeError("Implement")

        if type(meta_field.remote_field) is ManyToManyRel:
            raise RuntimeError("Implement")

        if meta_field.remote_field:
            # check if we should change the id
            new_id = int(json_value)
            my_id = getattr(self, field_name)

            if my_id == new_id:
                return False

            setattr(self, field_name, new_id)
            return True

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
        current_value = getattr(self, field_name)
        if current_value != new_value:
            setattr(self, field_name, new_value)
            return True

        return False

    def meta_to_json(self, include_many_to_many=False, rename=None, exclude=None, include=None, exclude_none=True):
        json_obj = dict()

        # add all fields
        for meta_field in self._meta.get_fields():
            if not self.should_include_field(meta_field, include, exclude, include_many_to_many):
                continue

            value = self.get_field_value(meta_field)

            if exclude_none and (value is None or value == [] or value == {}):
                continue

            json_obj[self.get_meta_key(meta_field, rename)] = self.get_field_value(meta_field)

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
        return (key in json_dict) and self.set_field_value(meta_field, json_dict[key])

    def update_from_dict(self, data_dict, rename=None):
        json_dict = to_json_dict(data_dict)
        updated_fields = []

        for meta_field in self._meta.get_fields():
            if self.update_field_from_json_dict(meta_field, json_dict, rename):
                key = self.get_object_key_from_meta_field(meta_field)
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
        return getattr(self, "owner_id", getattr(self, "author_id", -1)) == user.id

    def can_be_created_by_request(self, request):
        return self.can_be_created_by_user(request.user)

    def can_be_created_by_user(self, user):
        return self.can_be_edited_by_user(user)

    def edit_from_dict(self, data_dict, rename=None, trusted=False, publish_event=True, event_type="update", event_extra=None):
        updated_fields = self.update_from_dict(data_dict, rename)

        if len(updated_fields) == 0 and event_extra is None:
            return

        if not trusted:
            # TODO: have a better validation flow
            self.full_clean()
        self.save(update_fields=updated_fields)
        update_dict = {}
        for updated_field in updated_fields:
            update_dict[updated_field] = getattr(self, updated_field)

        event = self.make_event(event_type, to_json_dict(update_dict), extra=event_extra)
        if publish_event:
            self.publish_event_raw(event)
        return event

    def edit_from_request(self, request, rename=None):
        if not self.can_be_edited_by_request(request):
            from establishment.errors.errors import BaseError
            raise BaseError.NOT_ALLOWED
        return self.edit_from_dict(request.POST, rename, publish_event=False)

    @classmethod
    def edit_view(cls, decorators=list()):
        def view_func(request):
            obj = cls.get_object_from_edit_request(request)
            obj.edit_from_request(request)
            return {"success": True}

        for decorator in reversed(decorators):
            view_func = decorator(view_func)

        return view_func

    @classmethod
    def create_from_request(cls, request):
        obj = cls()
        obj.update_from_dict(request.POST)
        if not obj.can_be_created_by_request(request):
            from establishment.errors.errors import BaseError
            raise BaseError.NOT_ALLOWED
        obj.full_clean()
        return obj

    @classmethod
    def create_view(cls, decorators=list()):
        def view_func(request):
            obj = cls.create_from_request(request)
            obj.save()
            return {"obj": obj}

        for decorator in reversed(decorators):
            view_func = decorator(view_func)

        return view_func

    @classmethod
    def fetch_view(cls, decorators=None, permission_filter=None, max_ids=256):
        def view_func(request):
            ids = int_list(request.GET.getlist("ids[]"))
            if len(ids) > max_ids:
                # TODO: log this, may need to ban some asshole
                from establishment.errors.errors import BaseError
                return BaseError.TOO_MANY_OBJECTS
            state = State(request)
            for obj in cls.objects.get(id__in=ids):
                if not permission_filter or permission_filter(obj):
                    state.add(obj)
            return state

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
