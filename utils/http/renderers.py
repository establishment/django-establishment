import datetime
import uuid
import json
import decimal
import dataclasses
from typing import Callable, Any

from django.utils import timezone


from establishment.utils.convert import to_camel_case
from establishment.utils.object_cache import ObjectStore
from establishment.utils.serializers import JSONFieldValueDict, JSONFieldValueList


# This class is only used in this file, to make the difference between
# returning None as a successful serialization and failing to serialize.
class SerializeError(Exception):
    pass


def normalize_to_primitive_type(obj: Any) -> Any:
    # TODO @establify merge this
    try:
        from utils.state import State  # type: ignore
    except Exception as exc:
        from establishment.utils.state import State  # type: ignore

    from establishment.utils.serializers import DefaultSerializer
    from establishment.utils.enums import ObjectEnum

    if obj is None:
        return obj
    if isinstance(obj, datetime.datetime):
        representation = obj.isoformat()
        if representation.endswith("+00:00"):
            representation = representation[:-6] + "Z"
        return representation
    if isinstance(obj, datetime.date):
        return obj.isoformat()
    if isinstance(obj, datetime.time):
        if timezone and timezone.is_aware(obj):
            raise ValueError("JSON can't represent timezone-aware times.")
        representation = obj.isoformat()
        return representation
    if isinstance(obj, datetime.timedelta):
        return obj.total_seconds()

    if isinstance(obj, ObjectEnum):
        return obj.get_value()

    if isinstance(obj, uuid.UUID):
        return str(obj.hex)
    if isinstance(obj, decimal.Decimal):
        return str(obj)

    if isinstance(obj, State):
        return obj.to_response()
    if isinstance(obj, ObjectStore):
        return obj.to_json()
    if DefaultSerializer.can_serialize(obj):
        return DefaultSerializer.serialize(obj)
    if dataclasses.is_dataclass(obj):
        return dataclasses.asdict(obj)

    # Any integer that won't fit in an IEEE double can't be handled by Javascript
    if isinstance(obj, int) and abs(obj) >= 2**52:
        return str(obj)

    if isinstance(obj, (str, int, float)):
        return obj

    # Make sure we can distinguish between returning None and failing to serialize.
    raise SerializeError


# TODO @establify fix this
class BlinkJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        return normalize_to_primitive_type(obj)

    @classmethod
    def dumps(cls, arg: Any) -> str:
        return json.dumps(arg, cls=cls)


def serialize_to_json(obj: Any, key_transform: Callable[[str], str]) -> Any:
    if isinstance(obj, (JSONFieldValueDict, JSONFieldValueList)):
        # If this object comes from a Django JSONField, don't touch it.
        return obj

    if isinstance(obj, (list, tuple)):
        return [serialize_to_json(item, key_transform) for item in obj]

    if isinstance(obj, dict):
        return {key_transform(k): serialize_to_json(v, key_transform) for k, v in obj.items()}

    new_obj = normalize_to_primitive_type(obj)
    if new_obj is not obj:
        # It's not the exact same object
        return serialize_to_json(new_obj, key_transform)
    return obj


# TODO What are the non-string args?
def to_camel_case_key(key: Any) -> Any:
    if isinstance(key, str):
        return to_camel_case(key)
    return key


# TODO: Should this be merged with to_camel_case_json?
def to_pure_camel_case_json(obj: Any) -> Any:
    # Integer keys are left as they are
    return serialize_to_json(obj, key_transform=to_camel_case_key)


def to_pure_json(obj: Any) -> Any:
    return serialize_to_json(obj, key_transform=lambda k: k)
