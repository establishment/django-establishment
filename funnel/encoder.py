import datetime
import json


class StreamJSONEncoder(json.JSONEncoder):
    """
    Class to serialized json objects that go to the redis stream
    """
    def default(self, obj):
        if hasattr(obj, "to_json"):
            return obj.to_json()
        elif isinstance(obj, datetime.datetime):
            return obj.timestamp()
        else:
            super().default(obj)

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