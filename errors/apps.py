from django.apps import AppConfig


class ErrorAppConfig(AppConfig):
    name = "establishment.errors"

    def ready(self):
        from .errors import ErrorList
        ErrorList.load_from_db_all_inheritors()
