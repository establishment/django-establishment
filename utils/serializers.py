from typing import Any, Callable, Generic, TypeVar, Union, Optional, get_args

from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Model as DjangoModel
from pydantic import BaseModel as PydanticModel, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema

from establishment.utils.convert import bytes_to_hex
from establishment.utils.proxy import ProxyObject
from establishment.utils.db.typed_json_field import TypedJSONField

SerializableObject = Union[DjangoModel, PydanticModel, ProxyObject]
SerializableObjectClass = type[SerializableObject]

T = TypeVar("T")
FieldSetType = dict[str, Callable[[T], Any]]


# Using a function to capture the property name for the lambda
def make_getter(model_class: SerializableObjectClass, prop_name: str) -> Callable[[Any], Any]:
    if issubclass(model_class, DjangoModel) or (
            issubclass(model_class, ProxyObject) and issubclass(model_class.wrapped_class, DjangoModel)):
        django_model = model_class if issubclass(model_class, DjangoModel) else model_class.wrapped_class
        meta_fields = [meta_field for meta_field in django_model._meta.get_fields() if meta_field.name == prop_name]
        if len(meta_fields) > 0:
            meta_field = meta_fields[0]
            if isinstance(meta_field, models.BinaryField):
                return make_binary_field_getter(prop_name)
            if isinstance(meta_field, TypedJSONField):
                return make_typed_json_field_getter(prop_name)
            if isinstance(meta_field, models.JSONField):
                return make_json_field_getter(prop_name)
            if isinstance(meta_field, ArrayField):
                base_field = meta_field.base_field
                if isinstance(base_field, models.BinaryField):
                    return make_binary_field_getter(prop_name, is_array=True)
                if isinstance(base_field, TypedJSONField):
                    return make_typed_json_field_getter(prop_name, array=True)
                if isinstance(base_field, models.JSONField):
                    return make_json_field_getter(prop_name, array=True)

    if hasattr(model_class, prop_name) and callable(getattr(model_class, prop_name)):
        return lambda obj: getattr(obj, prop_name)()
    return lambda obj: getattr(obj, prop_name)


# All these wrapper classes do is marking the data, so the serializer doesn't change the case
class JSONFieldValueDict(dict):
    @classmethod
    def __get_pydantic_json_schema__(cls, schema: core_schema.JsonSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        # Use the same schema that would be used for `dict`
        return handler(core_schema.json_schema())


class JSONFieldValueList(list):
    @classmethod
    def __get_pydantic_json_schema__(cls, schema: core_schema.JsonSchema, handler: GetJsonSchemaHandler) -> JsonSchemaValue:
        # Use the same schema that would be used for `dict`
        return handler(core_schema.list_schema())


def make_json_field_getter(prop_name: str, array: bool = False) -> Callable[[Any], Any]:
    def func(obj: Any) -> Any:
        value = getattr(obj, prop_name)
        # For a nested JSON we'll wrap it in a custom class so the serializer knows not to touch it.
        if value and isinstance(value, list):
            value = JSONFieldValueList(value)
        if value and isinstance(value, dict):
            value = JSONFieldValueDict(value)
        return value

    def array_func(obj: Any) -> Any:
        value = getattr(obj, prop_name)
        if value:
            return JSONFieldValueList(value)
        return value

    return func if not array else array_func


def make_typed_json_field_getter(prop_name: str, array: bool = False) -> Callable[[Any], Any]:
    def func(obj: Any) -> Any:
        value = getattr(obj, prop_name)
        if value and isinstance(value, PydanticModel):
            value = value.model_dump()
        return value

    def array_func(obj: Any) -> Any:
        value = getattr(obj, prop_name)
        if value:
            value = list(map(lambda entry: entry.model_dump() if isinstance(entry, PydanticModel) else entry, value))
        return value

    return func if not array else array_func


def make_binary_field_getter(prop_name: str, is_array: bool = False) -> Callable[[Any], Union[Optional[str], list[str]]]:
    def serialize(value: Any) -> str:
        if not isinstance(value, bytes):
            value = bytes(value)
        return bytes_to_hex(value)

    def func(obj: Any) -> Optional[str]:
        value = getattr(obj, prop_name)
        if value is not None:
            value = serialize(value)
        return value

    def array_func(obj: Any) -> Optional[list[str]]:
        value = getattr(obj, prop_name)
        if value is not None:
            value = list(map(serialize, value))
        return value

    return func if not is_array else array_func


class SerializerFieldDescriptor(Generic[T]):
    def __init__(self, name: str, getter: Callable[[T], Any]):
        self.name = name
        self.getter = getter


# TODO: rename this
class DefaultSerializer:
    special_members: set[str] = {"serializer_include", "serializer_exclude"}
    cached_values: dict[Any, list[SerializerFieldDescriptor]] = {}

    @classmethod
    def default_include_set_for_django_model(cls, model_class: type[DjangoModel]) -> FieldSetType:
        meta_fields = model_class._meta.get_fields()
        result: FieldSetType = {}
        for meta_field in meta_fields:
            name = meta_field.name

            if type(meta_field) is models.ManyToOneRel or meta_field.many_to_many:
                # We don't automatically serialize Mto1/MtoM relations because it would require an extra db query
                continue

            if type(meta_field) is models.OneToOneRel and meta_field.auto_created:
                # We don't automatically add reverse relations
                continue

            if meta_field.remote_field:  # Regular foreign key TODO: better condition
                name += "_id"

            result[name] = make_getter(model_class, name)

        return result

    @classmethod
    def default_include_set_for_pydantic_model(cls, model_class: type[PydanticModel]) -> FieldSetType:
        include_set: FieldSetType = {}
        for prop_name in model_class.schema()["properties"].keys():
            if prop_name not in cls.special_members:
                include_set[prop_name] = make_getter(model_class, prop_name)
        return include_set

    @classmethod
    def default_include_set_for_class(cls, model_class: SerializableObjectClass) -> FieldSetType:
        if issubclass(model_class, ProxyObject):
            return cls.default_include_set_for_class(model_class.wrapped_class)
        if issubclass(model_class, PydanticModel):
            return cls.default_include_set_for_pydantic_model(model_class)
        if issubclass(model_class, DjangoModel):
            return cls.default_include_set_for_django_model(model_class)
        raise ValueError(f"Trying to create serializer include_set for type {model_class} without an explicit "
                         f"serializer_include. A default serializer_include can be inferred for Django and "
                         f"pydantic models.")

    # We return an array directly, since we'll just iterate anyway through it
    @classmethod
    def make_include_set(cls,
                         model_class: SerializableObjectClass,
                         include: Optional[list],
                         exclude: Optional[list]) -> list[SerializerFieldDescriptor]:
        include_set: FieldSetType = {}
        if include is None:
            include_set.update(cls.default_include_set_for_class(model_class))
        for key in include or []:
            if key == "__all__":
                include_set.update(cls.default_include_set_for_class(model_class))
            elif isinstance(key, str):
                include_set[key] = make_getter(model_class, key)
            else:
                if isinstance(key[1], str):
                    include_set[key[0]] = make_getter(model_class, key[1])
                else:
                    include_set[key[0]] = key[1]
        for key in exclude or []:
            include_set.pop(key, None)

        return [SerializerFieldDescriptor(k, v) for k, v in include_set.items()]

    @classmethod
    def get_model_class_special_member(cls, model_class: SerializableObjectClass, member_name: str) -> Any:
        if issubclass(model_class, PydanticModel):
            return model_class.schema()["properties"].get(member_name, {}).get("default", None)
        return getattr(model_class, member_name, None)

    @classmethod
    def include_set_for_class(cls, model_class: SerializableObjectClass) -> list[SerializerFieldDescriptor]:
        if model_class in cls.cached_values:
            return cls.cached_values[model_class]

        serializer_include = cls.get_model_class_special_member(model_class, "serializer_include")
        serializer_exclude = cls.get_model_class_special_member(model_class, "serializer_exclude")
        include_set = cls.make_include_set(model_class, serializer_include, serializer_exclude)

        cls.cached_values[model_class] = include_set

        return include_set

    @classmethod
    def can_serialize(cls, obj: Any) -> bool:
        return isinstance(obj, get_args(SerializableObject))

    @classmethod
    def serialize(cls, obj: Optional[SerializableObject]) -> Any:
        if obj is None:
            return None

        to_json = getattr(obj, "to_json", None)
        if to_json is not None and callable(to_json):
            return to_json()

        include_set = cls.include_set_for_class(obj.__class__)

        return {
            field.name: field.getter(obj) for field in include_set
        }
