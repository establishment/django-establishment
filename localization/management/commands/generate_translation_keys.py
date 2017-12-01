import json

from django.core.management import BaseCommand

from ...models import TranslationKey


class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        with open("translations.json", "r") as translations_log_file:
            translations = json.loads(translations_log_file.read())
        for translation in translations:
            key, created = TranslationKey.objects.get_or_create(value=translation["text"])
            if created:
                print('Key "' + key.value + '" created with id', key.id)
