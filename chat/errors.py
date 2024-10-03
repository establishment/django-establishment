from establishment.utils.errors_deprecated import get_error, ErrorList


class ChatError(ErrorList):
    INVALID_MESSAGE_CONTENT = get_error("Invalid message content")
    MESSAGE_NOT_EDITABLE = get_error("Message not editable")
    MESSAGE_LIMIT_EXCEEDED = get_error("Message limit exceeded")
    NEW_PRIVATE_CHAT_LIMIT_EXCEEDED = get_error("Too many private chats initiated")
