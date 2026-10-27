from establishment.utils.errors import APIError


class InvalidMessageContent(APIError):
    code = 3400
    default_message = "Invalid message content"


class MessageLimitExceeded(APIError):
    code = 3401
    default_message = "Message limit exceeded"


class NewPrivateChatLimitExceeded(APIError):
    code = 3402
    default_message = "Too many private chats initiated"
