from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class EmailingError(ErrorList):
    INVALID_ID = get_error(message="Invalid id provided.")
    INVALID_OBJECT_TYPE = get_error(message="Invalid objectType")
    INVALID_ACTION = get_error(message="Invalid action for objectType")
    FIELD_NOT_FOUND = get_error(message="A required field was left empty.")
    INVALID_CAMPAIGN_START = get_error(message="This campaign must be sent manually.")
