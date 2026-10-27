from establishment.utils.errors import APIError


class EmptyTranslationEntry(APIError):
    code = 3300
    default_message = "Entry values cannot be empty"


class OneInvalidTranslationKey(APIError):
    code = 3301
    default_message = "One of the keys is not valid"


class TranslationKeyNotFound(APIError):
    code = 3302
    default_message = "Key doesn't exist"


class InvalidTranslationValue(APIError):
    code = 3303
    default_message = "Invalid translation value"
