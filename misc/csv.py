# ----- Blink code
from __future__ import annotations

import csv
from io import StringIO
from typing import TypeVar, Union, Callable, Any, Generic, Iterable

T = TypeVar("T")
CSVColumnList = list[tuple[str, Union[str, Callable[[T], Any]]]]


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
        result: Any = self.loader(obj)
        if isinstance(result, set):
            result = len(result)
        return result

    @staticmethod
    def load(columns: CSVColumnList[T]) -> list[CSVColumnHandler[T]]:
        result: list[CSVColumnHandler[T]] = []
        for col in columns:
            if isinstance(col, CSVColumnHandler):
                result.append(col)
            else:
                name, loader = col
                if isinstance(loader, str):
                    loader = make_loader(loader)
                result.append(CSVColumnHandler(name, loader))
        return result


class CSVObjectWriter(Generic[T]):
    writer: Any
    stream: Any

    def __init__(self, columns: CSVColumnList[T], stream: Any):
        self.columns = CSVColumnHandler.load(columns)
        self.stream = stream
        self.writer = csv.writer(self.stream, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL)
        # Write the header row
        self.writer.writerow([col.get_name() for col in self.columns])

    def write_object(self, obj: T):
        columns = [col.get_entry(obj) for col in self.columns]
        self.writer.writerow(columns)

    def write_all(self, objects: Iterable[T]):
        for obj in objects:
            self.write_object(obj)

    def close(self):
        self.stream.close()


def build_string_csv(objects: Iterable[T], columns: CSVColumnList) -> str:
    csv_writer: CSVObjectWriter[T] = CSVObjectWriter(columns, StringIO())
    csv_writer.write_all(objects)
    return csv_writer.stream.getvalue()
