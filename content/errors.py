from establishment.utils.errors_deprecated import get_error, ErrorList


class ContentError(ErrorList):
    TRANSLATION_EXISTS = get_error("A translation in this language already exists.")

    REQUESTED_TOO_MANY_ARTICLES = get_error("You have requested too many articles at once.")
    PROTECTED_ARTICLE = get_error("The article is protected.")
    TOO_MUCH_FEEDBACK = get_error("Too many posts, ignoring")

    QUESTIONNAIRE_NOT_AVAILABLE = get_error("This questionnaire is no longer available")
