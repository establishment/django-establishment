from typing import TypeVar, Generic, Any
from django.db.models import Model as DjangoModel

# TODO @establify centralize
DjangoModelT = TypeVar("DjangoModelT", bound=DjangoModel)


class ProxyObject(Generic[DjangoModelT]):
    wrapped_class: type[DjangoModelT]

    def __init__(self, obj: DjangoModelT):
        self.wrapped_obj = obj

    def __getattr__(self, item: str) -> Any:
        return getattr(self.wrapped_obj, item)

    @classmethod
    def __class_getitem__(cls, item: type) -> type:
        return type(f"Proxy__{item.__name__}", (ProxyObject,), {"wrapped_class": item})
