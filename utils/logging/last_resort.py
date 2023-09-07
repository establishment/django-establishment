from django.conf import settings


def last_resort_log(message: str) -> None:
    print(message)
    if settings.RUNNING_TESTS:
        raise RuntimeError(message)


def handle_save_error(exc: Exception) -> None:
    last_resort_log(f"Failed to save log messages {repr(exc)}")
