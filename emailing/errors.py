from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class EmailingError(ErrorList):
    INVALID_ID = get_error(message="Invalid id provided.")
    INVALID_OBJECT_TYPE = get_error(message="Invalid objectType")
    INVALID_ACTION = get_error(message="Invalid action for objectType")

    GENERIC_FIELD_NOT_FOUND_ERROR = get_error(message="A required field was left empty.")
    FIELD_NOT_FOUND_ERRORS = {
        "objectType": get_error(message="You must specify an object type"),
        "action": get_error(message="You must specify an action"),
        "fromId": get_error(message="You must specify a sender id"),
        "toId": get_error(message="You must specify a receiver id"),
        "id": get_error(message="You must specify the object's id for the given action")
    }

    @classmethod
    def FIELD_NOT_FOUND(cls, field_name):
        if field_name not in cls.FIELD_NOT_FOUND_ERRORS:
            return cls.GENERIC_FIELD_NOT_FOUND_ERROR
        return cls.FIELD_NOT_FOUND_ERRORS[field_name]
