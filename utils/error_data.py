from traceback import format_exception
from typing import Optional

from django.core.exceptions import ObjectDoesNotExist
from pydantic import ValidationError as PydanticValidationError

from establishment.utils.errors import APIError, ValidationError, object_not_found, InternalServerError
from establishment.utils.state import State


def get_exception_stacktrace(exc: Exception, frames_limit: int = 64) -> str:
    return "".join(format_exception(exc.__class__, exc, exc.__traceback__, limit=frames_limit))


class ErrorData:
    def __init__(self,
                 api_error: APIError,
                 code: int,
                 message: str,
                 fields: list[dict],
                 stacktrace: str,
                 state: Optional[State]):
        self.api_error = api_error
        self.code = code
        self.message = message
        self.fields = fields
        self.stacktrace = stacktrace
        self.state = state


def get_error_data(exc: Exception) -> ErrorData:
    stacktrace = get_exception_stacktrace(exc)
    # TODO @Mihai @cleanup remove this. Fix the tests
    if isinstance(exc, ObjectDoesNotExist):
        exc = object_not_found

    if not isinstance(exc, APIError):
        print("Unhandled error:", exc, repr(exc))
        # Convert it to an InternalServerError
        try:
            raise InternalServerError() from exc
        except InternalServerError as e:
            exc = e

    return ErrorData(
        api_error=exc,
        code=exc.code,
        message=exc.message,
        fields=[{"field": key, "message": value} for key, value in exc.detail.items()],
        stacktrace=stacktrace,
        state=exc.state
    )


def convert_pydantic_exception(exc: PydanticValidationError) -> ValidationError:
    message = None  # Use the default
    field_errors = []
    for error in exc.errors():
        field_info = error["loc"]
        if len(field_info) > 0:
            field_name = str(field_info[0])
            field_message = str(error["msg"]).removeprefix("Value error, ")
            field_errors.append((field_name, field_message))
        else:
            message = str(error["ctx"]["error"])

    return ValidationError(message=message, detail={field_name: field_message for field_name, field_message in field_errors})
