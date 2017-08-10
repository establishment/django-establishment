from establishment.errors.models import get_error
from establishment.errors.errors import ErrorList


class ContentError(ErrorList):
    TRANSLATION_EXISTS = get_error(message="A translation in this language already exists.")

    REQUESTED_TOO_MANY_ARTICLES = get_error(message="You have requested too many articles at once.")
    PROTECTED_ARTICLE = get_error(message="The article is protected.")
    TOO_MUCH_FEEDBACK = get_error(message="Too many posts, ignoring")