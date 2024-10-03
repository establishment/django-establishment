from establishment.utils.errors_deprecated import get_error, ErrorList


class ForumError(ErrorList):
    INVALID_MESSAGE_CONTENT = get_error("Invalid message content")
    MESSAGE_NOT_EDITABLE = get_error("Message not editable")
    MESSAGE_LIMIT_EXCEEDED = get_error("Message limit exceeded")
    FORUM_THREAD_LIMIT_EXCEEDED = get_error("Forum thread limit exceeded")
    TITLE_TOO_LONG = get_error("Forum thread title max length exceeded")
    INVALID_TITLE = get_error("Invalid title. (forum thread title must contain at least one alpha-numeric character)")
