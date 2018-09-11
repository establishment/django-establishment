from django.apps import AppConfig
from django.conf import settings


class ChatAppConfig(AppConfig):
    name = "establishment.chat"

    def ready(self):
        from establishment.chat.models import GroupChat

        settings.ACTIVITY_STREAMS_MATCHERS = getattr(settings, "ACTIVITY_STREAMS_MATCHERS", [])
        settings.ACTIVITY_STREAMS_MATCHERS.append(GroupChat)
