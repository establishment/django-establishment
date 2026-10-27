# TODO @Mihai move get_error_data(exc, is_for_admin=True) into the general error handling code and remove the special stuff
# TODO @Mihai move this to a handler.py file
import logging
import sys
from collections.abc import Mapping
from types import TracebackType

global_logger = logging.getLogger(None)


def get_logger() -> logging.Logger:
    global global_logger

    # Path the makeRecord method to keep track of extra
    # TODO Maybe patch _log better?
    original_make_record = global_logger.makeRecord

    # Putting python3.12 here, so you know to check when upgrading the version
    def makeRecordWithExtra(name: str,
                            level: int,
                            fn: str,
                            lno: int,
                            msg: object,
                            args: tuple[object, ...] | Mapping[str, object],
                            exc_info: tuple[type[BaseException], BaseException, TracebackType | None] | tuple[None, None, None] | None,
                            func: str | None = None,
                            extra: Mapping[str, object] | None = None,
                            sinfo: str | None = None) -> logging.LogRecord:
        extra_fields = extra
        log_record = original_make_record(name, level, fn, lno, msg, args, exc_info, func, extra, sinfo)
        if extra_fields is not None:
            log_record._original_extra = extra_fields
        return log_record

    global_logger.makeRecord = makeRecordWithExtra  # type: ignore

    global_logger.setLevel(logging.INFO)

    stderr_handler = logging.StreamHandler(stream=sys.stderr)
    stderr_handler.setLevel(logging.ERROR)
    global_logger.addHandler(stderr_handler)

    return global_logger


logger = get_logger()
