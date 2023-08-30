from __future__ import annotations

import time
from typing import Union, TypeVar, Generic, Optional, Iterable, Callable

from django.db.models import Model, Q

IdType = Union[int, str]
ModelT = TypeVar("ModelT", bound=Model)


# TODO: This should be made thread safe even without relying on the GIL
class DBObjectStore(Generic[ModelT]):
    def __init__(self,
                 object_class: type[ModelT],
                 objects: Optional[Iterable[ModelT]] = None,
                 default_max_age: Optional[float] = None):
        if not objects:
            objects = []
        self.object_class = object_class
        self.cache: dict[IdType, tuple[ModelT, float]] = {}
        self.default_max_age = default_max_age
        for obj in objects:
            self.add(obj)

    # TODO: add method for object removal
    def get_raw(self, id: IdType) -> tuple[ModelT, float]:
        if not self.has(id):
            self.add(self.object_class.objects.get(id=id))
        return self.cache[id]

    def get(self, id: IdType, max_age: Optional[float] = None) -> ModelT:
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.get_raw(id)
        if max_age and time.time() - max_age > timestamp:
            del self.cache[id]
            obj, timestamp = self.get_raw(id)
        return obj

    def find_raw(self, python_query: Callable[[ModelT], bool], db_query: Q) -> tuple[ModelT, float]:
        for (obj, age) in self.cache.values():
            if python_query(obj):
                return obj, age
        obj = self.object_class.objects.get(db_query)
        self.add(obj)
        return self.cache[obj.id]

    def find(self, python_query: Callable[[ModelT], bool], db_query: Q, max_age: Optional[float] = None) -> ModelT:
        if not max_age:
            max_age = self.default_max_age
        obj, timestamp = self.find_raw(python_query, db_query)
        if max_age and time.time() - max_age > timestamp:
            del self.cache[obj.id]
            obj, timestamp = self.get_raw(obj.id)
        return obj

    def has(self, id: IdType) -> bool:
        return id in self.cache

    def add(self, obj: ModelT, timestamp: float = time.time()):
        self.cache[obj.id] = (obj, timestamp)

    def size(self) -> int:
        return len(self.cache)

    def is_empty(self) -> bool:
        return self.size() == 0

    def all(self) -> list[ModelT]:
        rez = [obj for obj, timestamp in self.cache.values()]
        rez.sort(key=lambda obj: obj.id)
        return rez

    def to_json(self) -> list[ModelT]:
        return self.all()
