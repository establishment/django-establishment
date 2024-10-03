from establishment.utils.errors_deprecated import get_error, ErrorList


class BaseconfigError(ErrorList):
    INVALID_COMMAND_INSTANCE = get_error("Invalid command instance")
