from __future__ import annotations

import inspect
from collections.abc import Iterable
from typing import Any, Union, Optional, Callable, Self

from establishment.utils.object_cache import IdType, ObjectStore, StateObject, StateObjectType, get_id_from_obj, DBObjectStore
from establishment.utils.proxy import ProxyObject
from django.db.models import Model as DjangoModel

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
                 user: Optional[DjangoModel] = None,  # TODO @establify should be AbstractBaseUser
                 extra: Optional[dict[str, Any]] = None,
                 delete_objects: list[StateObject] = []):
        self.object_caches: dict[str, ObjectStore] = {}
        self.user = user
        self.extra: dict[str, Any] = extra or {}
        self.events: list[dict[str, Any]] = []
        self.add(*objects)
        for obj in delete_objects:
            self.add_delete_event(obj)

    def __str__(self) -> str:
        from establishment.utils.convert import canonical_str
        return canonical_str(self)

    @classmethod
    def get_object_name(cls, object_type_or_name: StateObjectType) -> str:
        if isinstance(object_type_or_name, str):
            return object_type_or_name

        object_type: type[StateObject] = object_type_or_name.__class__ if not inspect.isclass(object_type_or_name) else object_type_or_name  # type: ignore

        if issubclass(object_type, ProxyObject) and not hasattr(object_type, "state_object_name"):
            return cls.get_object_name(object_type.wrapped_class)

        # TODO @establify just use one of these
        if hasattr(object_type, "state_object_name"):
            return object_type.state_object_name

        if hasattr(object_type, "object_type"):
            return object_type.object_type()

        # TODO @establify fix this
        # if hasattr(object_type, "_meta") and hasattr(object_type._meta, "db_table"):
        #     return object_type._meta.db_table

        return object_type.__name__

    @classmethod
    def object_to_event(cls, obj: StateObject, event_type: str = "updateOrCreate") -> dict[str, Any]:
        return {
            "objectId": get_id_from_obj(obj),
            "objectType": cls.get_object_name(obj),
            "type": event_type,
            "data": obj,
        }

    def has_store(self, object_type: StateObjectType) -> bool:
        return self.get_object_name(object_type) in self.object_caches

    def new_store(self, object_type: StateObjectType) -> ObjectStore:
        if issubclass(object_type, DjangoModel):  # type: ignore
            return DBObjectStore(object_type)  # type: ignore
        return ObjectStore(object_type)  # type: ignore

    # Tries to create the store if it doesn't exist
    def get_store(self, object_type: StateObjectType) -> ObjectStore:
        class_key = self.get_object_name(object_type)
        if class_key not in self.object_caches:
            if not inspect.isclass(object_type):
                object_type = object_type.__class__  # type: ignore
            self.object_caches[class_key] = self.new_store(object_type)
        return self.object_caches[class_key]

    def remove_store(self, object_type: StateObjectType):
        class_key = self.get_object_name(object_type)
        return self.object_caches.pop(class_key, True)

    def has(self, object_type: StateObjectType, id: IdType) -> bool:
        object_store = self.get_store(object_type)
        return object_store.has(id)

    def get(self, object_type: StateObjectType, id: IdType) -> StateObject:
        object_store = self.get_store(object_type)
        return object_store.get(id)  # type: ignore

    def add(self, *objects: StateObjectList):
        if len(objects) != 1:
            for obj in objects:
                self.add(obj)
            return
        obj = objects[0]
        if obj is None:
            return
        if not isinstance(obj, StateObject) and hasattr(obj, "__iter__"):  # type: ignore # Ugh, terrible condition
            self.add(*obj)
            return
        # TODO These should all be added with the same timestamp, sync this top-level
        store = self.get_store(obj)  # type: ignore
        store.add(obj)

    def add_delete_event(self, obj: StateObject):
        event = self.object_to_event(obj, "delete")
        # Now clear the data, since we won't have an object later
        event["data"] = {}
        self.events.append(event)

    def add_extra(self, extra: dict[str, Any]) -> Self:
        self.extra.update(extra)
        return self

    def all(self, object_type: Optional[StateObjectType]) -> list[StateObject]:
        if object_type is None:
            result = []
            for store in self.object_caches.values():
                result += store.all()
            return result
        return self.get_store(object_type).all()

    # TODO @establify Maybe rename as to_dict?
    def to_json(self) -> dict[str, Any]:
        for processor in STATE_SERIALIZATION_MIDDLEWARE:
            processor(self)

        return {
            store_name: store for store_name, store in self.object_caches.items() if not store.is_empty()
        }

    def to_response(self, extra: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        result: dict[str, Any] = {
            **self.extra,
        }
        self_as_dict = self.to_json()
        if self_as_dict:
            # Only add there are objects to the state
            result["state"] = self_as_dict
        if self.events:
            result["events"] = self.events
        if extra:
            result.update(extra)
        return result
