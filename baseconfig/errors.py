from establishment.errors.models import get_error
from establishment.errors.errors import ErrorList


class BaseconfigError(ErrorList):
    INVALID_COMMAND_INSTANCE = get_error(message="Invalid command instance")
