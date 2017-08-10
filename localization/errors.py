from establishment.errors.models import get_error
from establishment.errors.errors import ErrorList


class LocalizationError(ErrorList):
    EMPTY_TRANSLATION_ENTRY = get_error(message="Entry values cannot be empty")
    ONE_INVALID_TRANSLATION_KEY = get_error(message="One of the key is not valid")
    TRANSLATION_KEY_NOT_FOUND = get_error(message="Key doesn't exist")
    INVALID_TRANSLATION_VALUE = get_error(message="Invalid translation value")
