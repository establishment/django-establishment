import json
import time

from establishment.funnel.encoder import StreamJSONEncoder
from establishment.webapp.base_views import JSONResponse

STATE_FILTERS = []


# TODO: This should be made thread safe even without relying on the GIL
class DBObjectStore(object):
    def __init__(self, object_class, objects=None, default_max_age=None):
        if not objects:
            objects = []
        self.object_class = object_class
        self.cache = {}
        self.default_max_age = default_max_age
        for obj in objects:
            self.add(obj)

    # TODO: add method for object removal
    def get_raw(self, id):
        if not self.has(id):
            self.add(self.object_class.objects.get(id=id))
        return self.cache[id]

    def get(self, id, max_age=None):
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.get_raw(id)
        if max_age and time.time() - max_age > timestamp:
            del self.cache[id]
            obj, timestamp = self.get_raw(id)
        return obj

    def has(self, id):
        return id in self.cache

    def add(self, obj, timestamp=time.time()):
        self.cache[obj.id] = (obj, timestamp)

    def size(self):
        return len(self.cache)

    def is_empty(self):
        return self.size() == 0

    def all(self):
        rez = [o[0] for o in self.cache.values()]
        rez.sort(key=lambda o: o.id)
        return rez

    def to_json(self):
        return self.all()


class DBObjectStoreWithNull(DBObjectStore):
    def get_raw(self, id):
        if not self.has(id):
            try:
                self.add(self.object_class.objects.get(id=id))
            except self.object_class.DoesNotExist:
                self.add_null(id)
        return self.cache[id]

    def add_null(self, id, timestamp=time.time()):
        self.cache[id] = (None, timestamp)


class State(object):
    def __init__(self, request=None, parent_cache=None, user=None):
        self.request = request
        self.object_caches = {}
        self.parent_cache = parent_cache
        # The user that's intended to receive this state
        self.user = (request and request.user) or user

    def __str__(self):
        return self.dumps()

    def get_store_key(self, ObjectClass):
        if hasattr(ObjectClass, "object_type"):
            return ObjectClass.object_type()
        if hasattr(ObjectClass, "_meta") and hasattr(ObjectClass._meta, "db_table"):
            return ObjectClass._meta.db_table
        return ObjectClass

    def has_store(self, ObjectClass):
        return self.get_store_key(ObjectClass) in self.object_caches

    def get_store(self, ObjectClass):
        class_key = self.get_store_key(ObjectClass)
        if class_key not in self.object_caches:
            self.object_caches[class_key] = DBObjectStore(ObjectClass)
        return self.object_caches[class_key]

    def has(self, ObjectClass, id):
        object_store = self.get_store(ObjectClass)
        if self.parent_cache and not object_store.has(id):
            return False
        return object_store.has(id)

    def get(self, ObjectClass, id):
        object_store = self.get_store(ObjectClass)
        if self.parent_cache and not object_store.has(id):
            object_store.add(self.parent_cache.get(ObjectClass, id))
        return object_store.get(id)

    def add(self, obj, timestamp=time.time()):
        if not obj:
            return
        self.get_store(obj.__class__).add(obj)
        if self.parent_cache:
            self.parent_cache.add(obj, timestamp)

    def add_all(self, objects, timestamp=time.time()):
        for obj in objects:
            self.add(obj, timestamp)

    def all(self, ObjectClass):
        return self.get_store(ObjectClass).all()

    def remove_store(self, ObjectClass):
        class_key = self.get_store_key(ObjectClass)
        return self.object_caches.pop(class_key, True)

    def to_json(self):
        for processor in STATE_FILTERS:
            processor(self)

        empty_keys = []
        for key in self.object_caches:
            if self.object_caches[key].is_empty():
                empty_keys.append(key)
        for key in empty_keys:
            self.object_caches.pop(key)

        return self.object_caches

    def dumps(self):
        return json.dumps(self, cls=StreamJSONEncoder, check_circular=False, separators=(',', ':'))

    def wrapped(self):
        return {
            "state": self,
        }

    def to_response(self, extra=None):
        result = self.wrapped()
        if extra:
            result.update(extra)
        return JSONResponse(result)

    # TODO: rename to from
    @classmethod
    def from_objects(cls, *args):
        state = cls()
        for arg in args:
            if hasattr(arg, '__iter__'):
                state.add_all(arg)
            else:
                state.add(arg)
        return state


# TODO: this doesn't belong here
def int_list(list, ignore_errors=True):
    result = []
    for value in list:
        try:
            result.append(int(value))
        except Exception as e:
            if not ignore_errors:
                raise e
    return result
