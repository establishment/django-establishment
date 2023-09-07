from typing import Any, Union

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError


def flat_json_validator(value: Any):
    if not isinstance(value, dict):
        raise DjangoValidationError("%(value)s failed Flat JSON schema check: not a dict", params={"value": value})
    if len(value) > settings.MAX_OBJECT_METADATA_KEYS:
        raise DjangoValidationError("%(value)s failed Flat JSON schema check: too many keys", params={"value": value})
    for k, v in value.items():
        if not isinstance(k, str):
            raise DjangoValidationError(
                "%(value)s failed Metadata JSON schema check: key %(key)s is not a string",
                params={"value": value, "key": k})
        if len(k) > settings.MAX_OBJECT_METADATA_KEY_LENGTH:
            raise DjangoValidationError(
                "%(value)s failed Flat JSON schema check: key %(key)s is too long",
                params={"value": value, "key": k})
        if v is not None and not isinstance(v, (str, int, float, bool)):
            raise DjangoValidationError(
                "%(value)s failed Flat JSON schema check: entry %(entry)s at key %(key)s is not a primitive type",
                params={"value": value, "key": k, "entry": v})


FlatDict = dict[str, Union[None, bool, int, float, str]]
