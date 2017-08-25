from django.apps import AppConfig


class WebAppConfig(AppConfig):
    name = "establishment.webapp"

    def ready(self):
        pass
