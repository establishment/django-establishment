from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class ForumError(ErrorList):
    INVALID_MESSAGE_CONTENT = get_error(message="Invalid message content")
    MESSAGE_NOT_EDITABLE = get_error(message="Message not editable")
    MESSAGE_LIMIT_EXCEEDED = get_error(message="Message limit exceeded")
    FORUM_THREAD_LIMIT_EXCEEDED = get_error(message="Forum thread limit exceeded")
    TITLE_TOO_LONG = get_error(message="Forum thread title max length exceeded")
    INVALID_TITLE = get_error(message="Invalid title. (forum thread title must contain at least one alpha-numeric character)")
