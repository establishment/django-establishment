import datetime
import json
import string

from establishment.utils.serializer import DefaultSerializer


class StreamJSONEncoder(json.JSONEncoder):
    """
    Class to serialized json objects that go to the redis stream
    """
    def default(self, obj):
        if DefaultSerializer.can_serialize(obj):
            return DefaultSerializer.serialize(obj)
        elif hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            result = obj.isoformat()
            if result.endswith("+00:00"):
                result = result[:-6] + "Z"
            return result
        elif isinstance(obj, bytes):
            return self.encode_bytes_as_hex(obj)
        elif isinstance(obj, memoryview):
            return self.encode_bytes_as_hex(obj.tobytes())
        else:
            super().default(obj)

    @staticmethod
    def encode_bytes_as_hex(bytes_blob):
        hex_characters = []
        for byte in bytes_blob:
            hex_characters.append(string.hexdigits[byte >> 4])
            hex_characters.append(string.hexdigits[byte & 15])
        return "".join(hex_characters)

    @classmethod
    def dumps(cls, obj):
        # TODO: pass on **kwargs?
        return json.dumps(obj, cls=cls)


class LoggingStreamJSONEncoder(StreamJSONEncoder):
    """
    Class that extends the basic Stream JSON encoder, with the extra
    ability to encode exceptions and stacktraces
    """
    def default(self, obj):
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