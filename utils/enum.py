from enum import Enum
from typing import Any, TypeVar, Union

from django.db.models import Q
from django.forms.utils import pretty_name


StrEnumType = TypeVar("StrEnumType", bound="StrEnum")
ObjectEnumType = TypeVar("ObjectEnumType", bound="ObjectEnum")


class StrEnum(str, Enum):
    @classmethod
    def values(cls) -> list[str]:
        return [key.value for key in cls]

    @classmethod
    def choices(cls) -> list[tuple[str, str]]:
        return [(value, pretty_name(value)) for value in cls.values()]

    # TODO if value is a field, can we get its name, and not explicitly pass field_name?
    @classmethod
    def build_query(cls: type[StrEnumType], value: Union[StrEnumType, list[StrEnumType], None], field_name: str) -> Q:
        if value is None:
            return Q()
        if isinstance(value, list):
            value = list(set(value))
            if len(value) == len(cls.values()):
                # If we're filtering by all values, assume there isn't a filter
                return Q()
            return Q(**{field_name + "__in": set(value)})
        else:
            return Q(**{field_name: value})

    @classmethod
    def cast(cls: type[StrEnumType], value: Union[str, bytes]) -> StrEnumType:
        if isinstance(value, bytes):
            value = value.decode()
        for entry in cls:
            if entry.value == value:
                return entry
        raise ValueError(f"Invalid value for ObjectEnum {cls.__name__}: {value}")


# TODO: Make this work with mypy when it's expecting a str in Django fields.
class ObjectEnum(Enum):
    def __init__(self, *args: Any, **kwargs: Any):
        self._value_ = self.get_value()
        self.__class__._value2member_map_[self._value_] = self

    def __str__(self) -> str:
        return self.get_value()

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.get_value() == other
        return super().__eq__(other)

    def __ne__(self, other: Any) -> bool:
        if isinstance(other, str):
            return self.get_value() != other
        return super().__ne__(other)

    def get_value(self) -> str:
        return self.name.lower()

    def get_pretty_name(self) -> str:
        return pretty_name(self.name)

    @classmethod
    def values(cls) -> list[str]:
        return [entry.get_value() for entry in cls]

    @classmethod
    def choices(cls) -> list[tuple[str, str]]:
        return [(entry.get_value(), entry.get_pretty_name()) for entry in cls]

    @classmethod
    def from_value(cls: type[ObjectEnumType], value: str) -> ObjectEnumType:
        for entry in cls:
            if entry.get_value() == value:
                return entry
        raise ValueError(f"Invalid value for ObjectEnum {cls.__name__}: {value}")
