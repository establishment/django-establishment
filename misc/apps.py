from django.apps import AppConfig

from .static_serve_patch import patch_static_serve


class MiscAppConfig(AppConfig):
    name = "establishment.misc"

    def ready(self):
        patch_static_serve()
