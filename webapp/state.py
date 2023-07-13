from __future__ import annotations
import json
import time
from typing import Any, Union, Optional

from django.http.request import HttpRequest
from django.contrib.auth.base_user import AbstractBaseUser
from establishment.funnel.encoder import StreamJSONEncoder
from establishment.webapp.base_views import JSONResponse

STATE_FILTERS = []

IdType = Union[int, str]


# TODO: This should be made thread safe even without relying on the GIL
class DBObjectStore(object):
    def __init__(self, object_class, objects: Any = None, default_max_age: Optional[int] = None):
        if not objects:
            objects = []
        self.object_class = object_class
        self.cache: dict[IdType, Any] = {}
        self.default_max_age = default_max_age
        for obj in objects:
            self.add(obj)

    # TODO: add method for object removal
    def get_raw(self, id: IdType):
        if not self.has(id):
            self.add(self.object_class.objects.get(id=id))
        return self.cache[id]

    def get(self, id: IdType, max_age: int = None):
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.get_raw(id)
        if max_age and time.time() - max_age > timestamp:
            del self.cache[id]
            obj, timestamp = self.get_raw(id)
        return obj

    def has(self, id: IdType) -> bool:
        return id in self.cache

    def add(self, obj, timestamp: int=time.time()):
        self.cache[obj.id] = (obj, timestamp)

    def size(self) -> int:
        return len(self.cache)

    def is_empty(self) -> bool:
        return self.size() == 0

    def add_null(self, id: IdType, timestamp: int=time.time()):
        self.cache[id] = (None, timestamp)

    def all(self) -> list:
        return sorted([o[0] for o in self.cache.values()], key=lambda o: o.id)

    def to_json(self) -> Any:
        return self.all()


class State(object):
    def __init__(self, *objects: Any, request: HttpRequest = None, parent_cache: State = None, user: AbstractBaseUser = None, extra: Optional[dict] = None) -> None:
        self.object_caches = {}
        self.extra = {}
        if extra:
            self.extra.update(extra)
        state_objects = []
        for obj in objects:
            # TODO There should be a middleware that does this sort of stuff
            if isinstance(obj, HttpRequest):
                request = obj
            else:
                state_objects.append(obj)
        self.request = request
        self.parent_cache = parent_cache
        # The user that's intended to receive this state
        self.user = user or (request and request.user)
        if len(state_objects) > 0:
            self.add(state_objects)

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

    def get_store(self, ObjectClass) -> DBObjectStore:
        class_key = self.get_store_key(ObjectClass)
        if class_key not in self.object_caches:
            self.object_caches[class_key] = DBObjectStore(ObjectClass)
        return self.object_caches[class_key]

    def has(self, ObjectClass, id: Union[str, int]):
        object_store = self.get_store(ObjectClass)
        if self.parent_cache and not object_store.has(id):
            return False
        return object_store.has(id)

    def get(self, ObjectClass, id):
        object_store = self.get_store(ObjectClass)
        if self.parent_cache and not object_store.has(id):
            object_store.add(self.parent_cache.get(ObjectClass, id))
        return object_store.get(id)

    # Add one or more objects to store. The last argument can be a float timestamp
    def add(self, *objects: Any) -> None:
        timestamp: float = time.time()
        if len(objects) > 1 and isinstance(objects[-1], float):
            objects = list(objects)
            timestamp = objects.pop()
        if len(objects) > 1:
            for obj in objects:
                self.add(obj, timestamp)
            return
        obj = objects[0]
        if hasattr(obj, "__iter__"):
            objects = list(obj)
            if len(objects) > 0:
                self.add(*objects, timestamp)
            return
        self.get_store(obj.__class__).add(obj)
        if self.parent_cache:
            self.parent_cache.add(obj, timestamp)

    def all(self, ObjectClass: Union[str, type]) -> list[Any]:
        return self.get_store(ObjectClass).all()

    def remove_store(self, ObjectClass):
        class_key = self.get_store_key(ObjectClass)
        return self.object_caches.pop(class_key, True)

    def to_json(self) -> dict[str, Any]:
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
            **self.extra,
            "state": self,
        }

    def to_response(self, extra: dict = None) -> JSONResponse:
        result = self.wrapped()
        if extra:
            result.update(extra)
        return JSONResponse(result)


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
