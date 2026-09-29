from django.apps import AppConfig
from django.conf import settings


def collect_public_state(state, global_constants, context_dict):
    from .models import Language, Country, TranslationKey, TranslationEntry

    state.add(Language.objects.all())
    state.add(TranslationEntry.objects.all())
    state.add(TranslationKey.objects.all())
    state.add(Country.objects.all())


class LocalizationAppConfig(AppConfig):
    name = "establishment.localization"

    def ready(self):
        settings.PUBLIC_STATE_COLLECTORS.append(collect_public_state)
