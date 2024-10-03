from typing import Optional, Any

from establishment.utils.errors import APIError
from establishment.webapp.base_views import JSONResponse


class OldAPIError(APIError):
    def to_response(self, extra: Optional[dict[str, Any]] = None) -> JSONResponse:
        response = {
            "error": self.to_json(),
        }
        if extra:
            response.update(extra)
        response["error"].update(getattr(self, "extra", {}))
        return JSONResponse(response)

    def to_json(self) -> dict[str, Any]:
        return {
            "id": self.code,
            "message": self.message,
            "statusCode": self.code,
        }


def get_error(message: str, error_code: Optional[int] = None) -> OldAPIError:
    result = OldAPIError(message)
    result.code = error_code or 1
    return result


class InheritorSetMeta(type):
    __inheritors__ = set()

    def __new__(cls, name, bases, dct):
        new_class = super().__new__(cls, name, bases, dct)
        cls.__inheritors__.add(new_class)
        return new_class


class ErrorList(object, metaclass=InheritorSetMeta):
    """
    Error enum classes need to inherit this to be able to be imported anytime (before models are ready for instance)
    After the error app is ready, and all models are loaded, we'll iterate over all inheritor classes and load
    their matching ErrorMessage models from the DB.
    """
    @classmethod
    def all(cls):
        # Iterate over all own fields that are exceptions
        for attr in dir(cls):
            value = getattr(cls, attr)
            if isinstance(value, APIError):
                yield attr, value


class BaseError(ErrorList):
    USER_NOT_AUTHENTICATED = get_error("User not authenticated", error_code=1)
    NOT_ALLOWED = get_error("Not allowed", error_code=2)
    OBJECT_NOT_FOUND = get_error("Object not found", error_code=3)
    INVALID_URL = get_error("Invalid url")
    OBJECT_ALREADY_EXISTS = get_error("The object you want to create already exists")
    INVALID_DATA = get_error("Validation error")
    TOO_MANY_OBJECTS = get_error("Requesting too many objects")
    MAINTENANCE = get_error("Website in maintenance mode!")
