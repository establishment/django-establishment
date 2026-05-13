from __future__ import annotations

from typing import Optional, Any, Union, ClassVar

from establishment.utils.state import State


# TODO @Mihai list all classes inheriting/instances or APIError somewhere  just like API endpoints
#  This should also include all instances of these classes
class APIError(Exception):
    code: int = 0
    default_message: str = "API Error"
    is_warning: bool = False
    http_status: ClassVar[int] = 400
    state: Optional[State]

    def __init__(self,
                 message: Optional[str] = None,
                 detail: Optional[dict[str, Any]] = None,
                 state: Optional[State] = None):
        self.message = message if message is not None else self.default_message
        self.detail = detail or {}
        self.state = state

    def __str__(self) -> str:
        return str(self.message)


# When using the syntax `raise APIError`, it's equivalent to `raise APIError()`
# (calling __init__ with no arguments). This type is useful when passing errors as function
# parameters (e.g. `MerchantLogMessage.error(merchant, ValidationError)`) where this translation
# doesn't happen.
ErrorType = Union[APIError, type[APIError]]


class ValidationError(APIError):
    code = 1001
    default_message = "Invalid payload"


class ParseError(APIError):
    code = 1002
    default_message = "Malformed request"


class AuthenticationFailed(APIError):
    code = 1003
    default_message = "Incorrect authentication credentials"
    http_status = 401


class NotAuthenticated(APIError):
    code = 1004
    default_message = "Authentication credentials were not provided"
    http_status = 401


class PermissionDenied(APIError):
    code = 1005
    default_message = "You do not have permission to perform this action"
    http_status = 403


action_not_allowed_in_session = PermissionDenied(message="This action is not permitted in this session")


class NotFound(APIError):
    code = 1006
    default_message = "Object not found"
    http_status = 404
    INVALID_MERCHANT: ClassVar[APIError]


# TODO this shouldn't be a specific error. Remove when making more generic
NotFound.INVALID_MERCHANT = NotFound("Invalid merchant")


object_not_found = NotFound(message="Object not found")


class HTTPMethodNotAllowed(APIError):
    code = 1007
    default_message = "HTTP Method not allowed for this path"
    http_status = 405


class FunctionalityNotSupported(APIError):
    code = 1008
    default_message = "Functionality not supported"
    http_status = 501


class UnsupportedMediaType(APIError):
    code = 1009
    default_message = "Unsupported media type in request"
    http_status = 415


class Throttled(APIError):
    code = 1010
    default_message = "Too many requests, try again later"
    http_status = 429


# TODO @Mihai this should be another error
class ServiceUnavailableError(APIError):
    code = 1011
    default_message = "Service temporarily unavailable; try again in a few moments"
    http_status = 503


class InternalServerError(APIError):
    code = 1012
    default_message = "Internal server error"
    http_status = 500


class BadRequest(APIError):
    code = 1013
    default_message = "Bad request"
