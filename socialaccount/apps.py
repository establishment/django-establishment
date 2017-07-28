from django.apps import AppConfig


class SocialAccountAppConfig(AppConfig):
    name = "establishment.socialaccount"

    def ready(self):
        from .models import SocialProvider
        SocialProvider.load()
