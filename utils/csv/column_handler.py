from __future__ import annotations

from typing import Union, Callable, Any, TypeVar, Generic

T = TypeVar("T")
CSVColumnDescriptor = tuple[str, Union[str, Callable[[T], Any]]]
CSVColumnList = list[CSVColumnDescriptor[T]]


def make_loader(attr_name: str) -> Callable[[T], Any]:
    def loader(obj: T) -> Any:
        if isinstance(obj, dict):
            return obj.get(attr_name)
        else:
            attr = getattr(obj, attr_name, "")
            if callable(attr):
                attr = attr()
            return attr

    return loader


class CSVColumnHandler(Generic[T]):
    def __init__(self, name: str, loader: Callable[[T], Any]):
        self.name = name
        self.loader = loader

    def get_name(self) -> str:
        return self.name

    def get_entry(self, obj: T) -> Any:
        # TODO: use our standard JSON serializer here
        return self.loader(obj)

    @staticmethod
    def load(columns: CSVColumnList[T]) -> list[CSVColumnHandler[T]]:
        result: list[CSVColumnHandler[T]] = []
        for name, loader in columns:
            if isinstance(loader, str):
                loader = make_loader(loader)
            result.append(CSVColumnHandler(name, loader))
        return result
