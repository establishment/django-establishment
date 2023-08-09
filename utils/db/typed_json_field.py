from __future__ import annotations

import json
from functools import cached_property
import typing
from typing import Union, Any, Optional

import pydantic
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import JSONField
from django.utils.module_loading import import_string
from pydantic import BaseModel


RawSchemaType = Union[str, type[BaseModel], list, tuple, Union[Any]]


def normalize_schemas(raw_schema: RawSchemaType) -> list[type[BaseModel]]:
    if typing.get_origin(raw_schema) == Union:
        return normalize_schemas(typing.get_args(raw_schema))
    if isinstance(raw_schema, (list, tuple)):
        all_schemas: list[type[BaseModel]] = []
        for schema_variant in raw_schema:
            all_schemas += normalize_schemas(schema_variant)
        return all_schemas
    if isinstance(raw_schema, str):
        return normalize_schemas(import_string(raw_schema))

    assert isinstance(raw_schema, type), f"Invalid schema {raw_schema} provided for TypedJSONField: must be a pydantic.BaseModel or Union of pydantic.BaseModel-s."
    assert issubclass(raw_schema, BaseModel), f"Invalid schema {raw_schema} provided for TypedJSONField"
    return [raw_schema]


def enforce_schema_for_value(value: Any, schemas: list[type[BaseModel]]) -> Optional[BaseModel]:
    if value is None or isinstance(value, tuple(schemas)):
        return value

    if not isinstance(value, dict):
        value = json.loads(value)

    last_error: Optional[Exception] = None
    for schema in schemas:
        try:
            return schema.parse_obj(value)
        except pydantic.ValidationError as exc:
            last_error = exc
    # If no schema matched, raise the last error
    if last_error is not None:
        raise last_error
    return None


# TODO @Darius @django4: Mypy cannot figure out the runtime type of this field.
#  Check out the django-stubs mypy extension, try to make this work.
class TypedJSONField(JSONField):
    def __init__(self, schema: RawSchemaType, **kwargs: Any):
        # Custom encoder and decoders not supported for this field.
        kwargs.pop("decoder", None)
        kwargs.pop("encoder", None)
        super().__init__(**kwargs)
        self.raw_schema = schema

        class TypedJSONEncoder(DjangoJSONEncoder):
            def encode(self, obj: Any) -> Any:
                if obj is not None and isinstance(obj, BaseModel):
                    return obj.json(exclude_unset=True)
                return super().encode(obj)

        self.encoder = TypedJSONEncoder

    def deconstruct(self) -> tuple[str, str, list[Any], dict[str, Any]]:
        name, path, args, kwargs = super().deconstruct()
        kwargs["schema"] = self.schemas
        kwargs.pop("decoder", None)
        kwargs.pop("encoder", None)
        return name, path, args, kwargs

    @cached_property
    def schemas(self) -> list[type[BaseModel]]:
        return normalize_schemas(self.raw_schema)

    def from_db_value(self, value: Any, expression: Any, connection: Any) -> Any:
        value = super().from_db_value(value, expression, connection)  # type: ignore
        return enforce_schema_for_value(value, self.schemas)

    # Enforce that every assignment to the field is checked by the Pydantic schema.
    class TypedField:
        def __init__(self, field: TypedJSONField):
            self.field = field

        def __get__(self, obj: Any, cls: Any = None) -> Any:
            return obj.__dict__[self.field.name]

        def __set__(self, obj: Any, value: Any):
            obj.__dict__[self.field.name] = enforce_schema_for_value(value, self.field.schemas)

    def contribute_to_class(self, cls: Any, name: str, *args: Any, **kwargs: Any):
        super().contribute_to_class(cls, name, *args, **kwargs)
        setattr(cls, name, self.TypedField(self))
