"""
This library is provided to allow standard python logging
to output log data as JSON formatted strings
"""
import inspect
import logging
import json
from logging.handlers import RotatingFileHandler
from queue import Queue
import re
import datetime
import traceback
import time

from inspect import istraceback
from collections import OrderedDict
from redis import StrictRedis
from establishment.misc.threading_helper import ThreadHandler


# http://docs.python.org/library/logging.html#logrecord-attributes
from establishment.funnel.encoder import LoggingStreamJSONEncoder

# skip natural LogRecord attributes
RESERVED_ATTRS = (
    'args', 'asctime', 'created', 'exc_info', 'exc_text', 'filename',
    'funcName', 'levelname', 'levelno', 'lineno', 'module',
    'msecs', 'message', 'msg', 'name', 'pathname', 'process',
    'processName', 'relativeCreated', 'stack_info', 'thread', 'threadName')

RESERVED_ATTR_HASH = dict(zip(RESERVED_ATTRS, RESERVED_ATTRS))


def merge_record_extra(record, target, reserved=RESERVED_ATTR_HASH):
    """
    Merges extra attributes from LogRecord object into target dictionary
    :param record: logging.LogRecord
    :param target: dict to update
    :param reserved: dict or list with reserved keys to skip
    """
    for key, value in record.__dict__.items():
        #this allows to have numeric keys
        if (key not in reserved and not (hasattr(key, "startswith") and key.startswith('_'))):
            target[key] = value
    return target


class JSONFormatter(logging.Formatter):
    """
    A custom formatter to format logging records as json strings.
    extra values will be formatted as str() if nor supported by
    json default encoder
    """

    def __init__(self, *args, **kwargs):
        """
        :param json_default: a function for encoding non-standard objects
            as outlined in http://docs.python.org/2/library/json.html
        :param json_encoder: optional custom encoder
        """

        self.json_default = kwargs.pop("json_default", None)
        self.json_encoder = kwargs.pop("json_encoder", LoggingStreamJSONEncoder)

        logging.Formatter.__init__(self, *args, **kwargs)
        if not self.json_encoder and not self.json_default:
            def _default_json_handler(obj):
                '''Prints dates in ISO format'''
                if isinstance(obj, datetime.datetime):
                    if obj.year < 1900:
                        # strftime do not work with date < 1900
                        return obj.isoformat()
                    return obj.strftime(self.datefmt or '%Y-%m-%dT%H:%M')
                elif isinstance(obj, datetime.date):
                    return obj.isoformat()
                elif isinstance(obj, datetime.time):
                    return obj.strftime('%H:%M')
                elif istraceback(obj):
                    tb = ''.join(traceback.format_tb(obj))
                    return tb.strip()
                elif isinstance(obj, Exception):
                    return "Exception: %s" % str(obj)
                return str(obj)
            self.json_default = _default_json_handler
        self._required_fields = self.parse()
        self._skip_fields = dict(zip(self._required_fields, self._required_fields))
        self._skip_fields.update(RESERVED_ATTR_HASH)

    def parse(self):
        """Parses format string looking for substitutions"""
        standard_formatters = re.compile(r'\((.+?)\)', re.IGNORECASE)
        return standard_formatters.findall(self._fmt)

    def add_fields(self, log_record, record, message_dict):
        """
        Override this method to implement custom logic for adding fields.
        """
        for field in self._required_fields:
            log_record[field] = record.__dict__.get(field)
        log_record.update(message_dict)
        merge_record_extra(record, log_record, reserved=self._skip_fields)

    def process_log_record(self, log_record):
        """
        Override this method to implement custom logic
        on the possibly ordered dictionary.
        """
        return log_record

    def format(self, record):
        """Formats a log record and serializes to json"""
        message_dict = {}
        if isinstance(record.msg, dict):
            message_dict = record.msg
            record.message = None
        else:
            record.message = record.getMessage()
        # only format time if needed
        if "asctime" in self._required_fields:
            record.asctime = self.formatTime(record, self.datefmt)

        if record.stack_info:
            message_dict["stackTrace"] = record.stack_info
        elif record.levelno >= logging.WARNING:
            # Anything above a warning receives a stacktrace automatically
            frame = inspect.currentframe()
            message_dict["stackTrace"] = traceback.format_stack(frame)

        # Display formatted exception, but allow overriding it in the user-supplied dict.
        if record.exc_info and not message_dict.get('exc_info'):
            message_dict['exc_info'] = self.formatException(record.exc_info)

        log_record = OrderedDict()

        self.add_fields(log_record, record, message_dict)
        log_record = self.process_log_record(log_record)

        return json.dumps(log_record, default=self.json_default, cls=self.json_encoder)


class BackgroundLoggingHandler(logging.Handler):
    def __init__(self, *args, **kwargs):
        super().__init__()
        self.record_queue = Queue(maxsize=128 << 10) # Drops anything when > 128k unlogged message records
        self.logging_thread_handler = ThreadHandler(self.__class__.__name__ + " background logging", self.background_thread)

        #TODO: at exit try to log whatever is unlogged

    def process_record(self, record):
        try:
            message = self.format(record)
        except Exception:
            self.handleError(record)

        self.write_message(message)

    def background_thread(self):
        while True:
            record = self.record_queue.get()
            self.process_record(record)

    def flush(self):
        """
        Flushes the stream.
        """
        pass

    def emit(self, record):
        """
        Pushes the record to the queue to be logged when the background thread comes around to it.
        """
        try:
            #TODO: should format the message here, in case it gets modified after this!
            self.record_queue.put(record, block=False, timeout=None)
        except Exception as e:
            pass


class RedisLoggingHandler(BackgroundLoggingHandler):
    """
    A handler class which writes logging records to a redis channel.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.channel = "global_logging"
        self.connect_to_redis()

    def connect_to_redis(self):
        while True:
            try:
                from django.conf import settings
                self.connection = StrictRedis(**settings.REDIS_CONNECTION_LOGGING)
                return
            except Exception as e:
                #TODO: log this to file also
                time.sleep(0.2)

    def process_record(self, record):
        # Add a record for the service that issued this logging statement
        from establishment.services.status import ServiceStatus
        record.service = ServiceStatus.log_info
        super().process_record(record)

    def write_message(self, message):
        while True:
            try:
                self.connection.publish(self.channel, "v " + message)
                return
            #TODO: exception should only take care of connection errors
            except Exception as e:
                # Try to reconnect to the redis server
                self.connect_to_redis()


class BackgroundRotatingFileHandler(BackgroundLoggingHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        #TODO: rewrite RotatingFileHandler to not call format twice (once on roolover check and once on emit)
        self.rotating_file_handler = RotatingFileHandler(*args, **kwargs)

    def setFormatter(self, formatter):
        self.formatter = formatter
        self.rotating_file_handler.formatter = formatter

    def process_record(self, record):
        self.rotating_file_handler.emit(record)
