from __future__ import annotations
import json
from collections.abc import Iterable
from typing import Any, Union, Optional, Callable

from django.contrib.auth.base_user import AbstractBaseUser
from establishment.funnel.encoder import StreamJSONEncoder
from establishment.utils.object_cache import IdType, ObjectStore, StateObject, StateObjectType

STATE_SERIALIZATION_MIDDLEWARE: list[Callable[[State], Any]] = []

OptionalStateObject = Optional[StateObject]
StateObjectList = Union[
    OptionalStateObject,
    Iterable[OptionalStateObject],
    Iterable[Iterable[OptionalStateObject]],
    Iterable[Iterable[Iterable[OptionalStateObject]]]
]


class State(object):
    def __init__(self,
                 *objects: StateObjectList,
                 user: Optional[AbstractBaseUser] = None,
                 extra: Optional[dict[str, Any]] = None,
                 delete_objects: list[StateObject] = []):
        self.object_caches: dict[str, ObjectStore] = {}
        self.user: AbstractBaseUser = user  # The user that's intended to receive this state
        self.extra: dict[str, Any] = extra or {}
        self.events: list[dict[str, Any]] = []
        self.add(objects)
        for obj in delete_objects:
            self.events.append(self.object_to_event(obj, "delete"))

    def __str__(self):
        from establishment.utils.convert import canonical_str
        return canonical_str(self)

    @classmethod
    def get_object_name(cls, object_type: StateObjectType) -> str:
        if isinstance(object_type, StateObject):
            object_type = object_type.__class__
        if isinstance(object_type, str):
            return object_type
        if hasattr(object_type, "object_type"):
            return object_type.object_type()
        if hasattr(object_type, "_meta") and hasattr(object_type._meta, "db_table"):
            return object_type._meta.db_table
        return object_type.__name__

    @classmethod
    def object_to_event(cls, obj: StateObject, event_type: str = "updateOrCreate") -> dict[str, Any]:
        return {
            "objectId": obj.id,
            "objectType": cls.get_object_name(obj),
            "type": event_type,
            "data": obj,
        }

    def has_store(self, object_type: StateObjectType) -> bool:
        return self.get_object_name(object_type) in self.object_caches

    def get_store(self, object_type: StateObjectType) -> ObjectStore:
        class_key = self.get_object_name(object_type)
        if class_key not in self.object_caches:
            if isinstance(object_type, StateObject):
                object_type = object_type.__class__
            self.object_caches[class_key] = ObjectStore(object_type)
        return self.object_caches[class_key]

    def remove_store(self, object_type: StateObjectType):
        class_key = self.get_object_name(object_type)
        return self.object_caches.pop(class_key, True)

    def has(self, object_type: StateObjectType, id: IdType) -> bool:
        object_store = self.get_store(object_type)
        return object_store.has(id)

    def get(self, object_type: StateObjectType, id: IdType) -> StateObject:
        object_store = self.get_store(object_type)
        return object_store.get(id)

    def add(self, *objects: StateObjectList):
        if len(objects) != 1:
            for obj in objects:
                self.add(obj)
            return
        obj = objects[0]
        if obj is None:
            return
        if hasattr(obj, "__iter__"):
            self.add(*obj)
            return
        # TODO These should all be added with the same timestamp, sync this top-level
        self.get_store(obj).add(obj)

    def add_delete_event(self, obj: StateObject):
        event = self.object_to_event(obj, "delete")
        self.events.append(event)

    def add_extra(self, extra: dict[str, Any]):
        self.extra.update(extra)

    def all(self, object_type: Optional[StateObjectType]) -> list[StateObject]:
        if object_type is None:
            result = []
            for store in self.object_caches.values():
                result += store.all()
            return result
        return self.get_store(object_type).all()

    def to_json(self) -> dict[str, Any]:
        for processor in STATE_SERIALIZATION_MIDDLEWARE:
            processor(self)

        return {
            store_name: store for store_name, store in self.object_caches.items() if not store.is_empty()
        }

    def to_response(self, extra: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        result: dict[str, Any] = {
            **self.extra,
            "state": self.to_json(),
        }
        if self.events:
            result["events"] = self.events
        if extra:
            result.update(extra)
        return result
