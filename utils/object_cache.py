from __future__ import annotations

import time
from typing import Union, TypeVar, Generic, Optional, Iterable, Callable

from django.db.models import Model as DjangoModel, Q

from establishment.utils.proxy import ProxyObject, DjangoModelT
from establishment.utils.pydantic import FakeModel

IdType = Union[int, str]
StateObject = Union[DjangoModel, FakeModel, ProxyObject]

# Anything from which a state type can be inferred from, including the object itself or a string with that name
StateObjectType = Union[str, StateObject, type[StateObject]]

StateObjectT = TypeVar("StateObjectT", bound=StateObject)


# TODO: This should be made thread safe even without relying on the GIL
class ObjectStore(Generic[StateObjectT]):
    def __init__(self,
                 object_class: type[StateObjectT],
                 objects: Optional[Iterable[StateObjectT]] = None,
                 default_max_age: Optional[float] = None):
        if not objects:
            objects = []
        self.object_class = object_class
        self.cache: dict[IdType, tuple[StateObjectT, float]] = {}
        self.default_max_age = default_max_age
        for obj in objects:
            self.add(obj)

    def add(self, obj: StateObjectT, timestamp: float = time.time()):
        self.cache[obj.id] = (obj, timestamp)

    def has(self, id: IdType) -> bool:
        return id in self.cache

    def get(self, id: IdType, max_age: Optional[float] = None) -> StateObjectT:
        if not max_age:
            max_age = self.default_max_age
        entry = self.cache.get(id)
        if entry is None:
            raise RuntimeError(f"Missing object {id}")
        obj, timestamp = entry
        if max_age and time.time() - max_age > timestamp:
            del self.cache[id]
            raise RuntimeError(f"Object expired {id}")
        return obj

    def size(self) -> int:
        return len(self.cache)

    def is_empty(self) -> bool:
        return self.size() == 0

    def all(self) -> list[StateObjectT]:
        rez = [obj for obj, timestamp in self.cache.values()]
        # TODO @establify keep this and fix tests?
        # rez.sort(key=lambda obj: obj.id)
        return rez

    def to_json(self) -> list[StateObjectT]:
        return self.all()


class DBObjectStore(ObjectStore[DjangoModelT]):
    def get_raw(self, id: IdType) -> tuple[DjangoModelT, float]:
        if not self.has(id):
            self.add(self.object_class.objects.get(id=id))
        return self.cache[id]

    def get(self, id: IdType, max_age: Optional[float] = None) -> DjangoModelT:
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.get_raw(id)
        if max_age and time.time() - max_age > timestamp:
            del self.cache[id]
            obj, timestamp = self.get_raw(id)
        return obj

    def find_raw(self, python_query: Callable[[DjangoModelT], bool], db_query: Q) -> tuple[DjangoModelT, float]:
        for (obj, age) in self.cache.values():
            if python_query(obj):
                return obj, age
        obj = self.object_class.objects.get(db_query)
        self.add(obj)
        return self.cache[obj.pk]

    def find(self, python_query: Callable[[DjangoModelT], bool], db_query: Q, max_age: Optional[float] = None) -> DjangoModelT:
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.find_raw(python_query, db_query)
        if max_age and time.time() - max_age > timestamp:
            obj_id = obj.pk
            del self.cache[obj_id]
            obj, timestamp = self.get_raw(obj_id)
        return obj
