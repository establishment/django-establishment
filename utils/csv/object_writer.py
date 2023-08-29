import csv
from io import StringIO
from typing import Any, Generic, Iterable

from .column_handler import T, CSVColumnList, CSVColumnHandler


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
