from django.core.management import BaseCommand

from establishment.baseconfig.models import public_settings_cache, PublicGlobalSettings
from ...models import GroupChat


class Command(BaseCommand):
    def handle(self, *args, **options):
        public_settings_key = "GLOBAL_CHAT_ID"

        if hasattr(public_settings_cache, public_settings_key):
            global_chat_id = getattr(public_settings_cache, public_settings_key)
            try:
                group_chat = GroupChat.objects.get(id=global_chat_id)
            except:
                print("Global chat id is set, but the object is missing from DB")
                return
            print("Global chat already exists with id ", global_chat_id)
            return

        global_chat = GroupChat.create("Global chat", None)

        public_setting = PublicGlobalSettings(
            key=public_settings_key,
            value=global_chat.id,
            export=True,
            export_name=public_settings_key
        )
        public_setting.save()
