from establishment.utils.errors import APIError


class ForumThreadLimitExceeded(APIError):
    code = 3500
    default_message = "Forum thread limit exceeded"


class TitleTooLong(APIError):
    code = 3501
    default_message = "Forum thread title max length exceeded"


class InvalidTitle(APIError):
    code = 3502
    default_message = "Invalid title. (forum thread title must contain at least one alpha-numeric character)"
