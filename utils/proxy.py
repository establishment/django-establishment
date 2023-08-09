from typing import TypeVar, Generic, Any

T = TypeVar("T")


class ProxyObject(Generic[T]):
    wrapped_class: type[T]

    def __init__(self, obj: T):
        self.wrapped_obj = obj

    def __getattr__(self, item: str) -> Any:
        return getattr(self.wrapped_obj, item)

    # TODO implement object_type to return the wrapped object_type. First make object_type non-classmethod

    @classmethod
    def __class_getitem__(cls, item: type) -> type:
        return type(f"Proxy__{item.__name__}", (ProxyObject,), {"wrapped_class": item})
