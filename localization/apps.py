from django.apps import AppConfig
from django.conf import settings


def ensure_default_language():
    from .models import Language
    try:
        Language.objects.get(id=1)
    except Exception:
        try:
            Language.objects.create(name="English", local_name="English", iso_code="eng")
        except Exception:
            print("Failed to create default language")


def collect_public_state(state, global_constants, context_dict):
    from .models import Language, Country, TranslationKey, TranslationEntry

    state.add_all(Language.objects.all())
    state.add_all(TranslationEntry.objects.all())
    state.add_all(TranslationKey.objects.all())
    state.add_all(Country.objects.all())


class LocalizationAppConfig(AppConfig):
    name = "establishment.localization"

    def ready(self):
        ensure_default_language()
        settings.PUBLIC_STATE_COLLECTORS.append(collect_public_state)
