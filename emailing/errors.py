from establishment.utils.errors_deprecated import get_error, ErrorList


class EmailingError(ErrorList):
    INVALID_ID = get_error("Invalid id provided.")
    INVALID_OBJECT_TYPE = get_error("Invalid objectType")
    INVALID_ACTION = get_error("Invalid action for objectType")
    FIELD_NOT_FOUND = get_error("A required field was left empty.")
    INVALID_CAMPAIGN_START = get_error("This campaign must be sent manually.")
