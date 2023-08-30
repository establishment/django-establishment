import datetime
import uuid
import json
import decimal
import dataclasses
from typing import Callable, Any

from pydantic import BaseModel
import django.db.models
from django.utils import timezone


# This class is only used in this file, to make the difference between
# returning None as a successful serialization and failing to serialize.
from establishment.utils.convert import to_camel_case
from establishment.utils.serializers import JSONFieldValueDict, JSONFieldValueList


class SerializeError(Exception):
    pass


def serialize_custom_primitive_types(obj: Any) -> Any:
    from utils.state import State
    from establishment.utils.serializers import DefaultSerializer
    from establishment.utils.enums import ObjectEnum
    if isinstance(obj, datetime.datetime):
        representation = obj.isoformat()
        if representation.endswith("+00:00"):
            representation = representation[:-6] + "Z"
        return representation
    if isinstance(obj, datetime.date):
        return obj.isoformat()
    if isinstance(obj, ObjectEnum):
        return obj.get_value()
    if isinstance(obj, datetime.time):
        if timezone and timezone.is_aware(obj):
            raise ValueError("JSON can't represent timezone-aware times.")
        representation = obj.isoformat()
        return representation
    if isinstance(obj, datetime.timedelta):
        return obj.total_seconds()
    if isinstance(obj, uuid.UUID):
        return str(obj.hex)
    if isinstance(obj, decimal.Decimal):
        return str(obj)
    if isinstance(obj, State):
        return obj.to_response()
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)
    if isinstance(obj, BaseModel) or isinstance(obj, django.db.models.Model):
        return DefaultSerializer.serialize(obj)
        # Any integer that won't fit in an IEEE double can't be handled by Javascript
    if isinstance(obj, int) and abs(obj) >= 2**52:
        return str(obj)

    # Make sure we can distinguish between returning None and failing to serialize.
    raise SerializeError


# TODO @establify fix this
class BlinkJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        try:
            return serialize_custom_primitive_types(obj)
        except SerializeError:
            super().default(obj)

    @classmethod
    def dumps(cls, arg: Any) -> str:
        return json.dumps(arg, cls=cls)


def serialize_to_json(obj: Any, key_transform: Callable[[str], str]) -> Any:
    if isinstance(obj, (JSONFieldValueDict, JSONFieldValueList)):
        # If this object comes from a Django JSONField, don't touch it.
        return obj
    if isinstance(obj, (list, tuple)):
        return [*map(lambda item: serialize_to_json(item, key_transform), obj)]
    if isinstance(obj, dict):
        return {key_transform(k): serialize_to_json(v, key_transform) for k, v in obj.items()}
    try:
        return serialize_custom_primitive_types(obj)
    except SerializeError:
        return obj


# TODO: Should this be merged with to_camel_case_json?
def to_pure_camel_case_json(obj: Any) -> Any:
    # Integer keys are left as they are
    return serialize_to_json(obj, key_transform=lambda key: to_camel_case(key) if isinstance(key, str) else key)


def to_pure_json(obj: Any) -> Any:
    return serialize_to_json(obj, key_transform=lambda k: k)