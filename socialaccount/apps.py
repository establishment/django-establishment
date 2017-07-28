from django.apps import AppConfig


class SocialAccountAppConfig(AppConfig):
    name = "establishment.socialaccount"

    def ready(self):
        from .models import SocialProvider
        try:
            SocialProvider.load()
        except:
            print("Failed to load social providers, only ok if doing a migration")
