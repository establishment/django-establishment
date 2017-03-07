from django.apps import AppConfig


def ensure_default_language():
    from .models import Language
    try:
        Language.objects.get(id=1)
    except Exception:
        try:
            Language.objects.create(name="English", local_name="English", iso_code="eng")
        except Exception:
            print("Failed to create default language")


class LocalizationAppConfig(AppConfig):
    name = "establishment.localization"

    def ready(self):
        ensure_default_language()
