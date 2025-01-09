import datetime
import json
import string
from typing import Any

from establishment.utils.convert import bytes_to_hex
from establishment.utils.serializers import DefaultSerializer
from django.conf import settings


class StreamJSONEncoder(json.JSONEncoder):
    """
    Class to serialized json objects that go to the redis stream
    """
    def default(self, obj: Any) -> Any:
        if DefaultSerializer.can_serialize(obj):
            return DefaultSerializer.serialize(obj)
        elif hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            if hasattr(settings, "FORMAT_DATE_TO_FLOAT") and settings.FORMAT_DATE_TO_FLOAT:
                return obj.timestamp()
            result = obj.isoformat()
            if result.endswith("+00:00"):
                result = result[:-6] + "Z"
            return result
        elif isinstance(obj, bytes):
            return bytes_to_hex(obj)
        elif isinstance(obj, memoryview):
            return bytes_to_hex(obj.tobytes())
        else:
            super().default(obj)

    @classmethod
    def dumps(cls, obj: Any) -> str:
        # TODO: pass on **kwargs?
        return json.dumps(obj, cls=cls)


class LoggingStreamJSONEncoder(StreamJSONEncoder):
    """
    Class that extends the basic Stream JSON encoder, with the extra
    ability to encode exceptions and stacktraces
    """
    def default(self, obj: Any) -> Any:
        #TODO: add serialization for tracebacks
        try:
            return super().default(obj)
        except Exception as e:
            # We can't serialize this naturally, just try to convert it to string
            pass

        try:
            return str(obj)
        except Exception as e:
            return "Unserializable object"
