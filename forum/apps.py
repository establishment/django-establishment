from django.apps import AppConfig


class ForumAppConfig(AppConfig):
    name = "establishment.forum"

    def ready(self):
        from establishment.funnel.stream import register_stream_handler
        from establishment.forum.models import Forum, ForumThread

        register_stream_handler(Forum)
        register_stream_handler(ForumThread)
