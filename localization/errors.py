from establishment.utils.errors_deprecated import get_error, ErrorList


class LocalizationError(ErrorList):
    EMPTY_TRANSLATION_ENTRY = get_error("Entry values cannot be empty")
    ONE_INVALID_TRANSLATION_KEY = get_error("One of the key is not valid")
    TRANSLATION_KEY_NOT_FOUND = get_error("Key doesn't exist")
    INVALID_TRANSLATION_VALUE = get_error("Invalid translation value")
