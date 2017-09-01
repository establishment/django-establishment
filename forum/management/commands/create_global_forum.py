from django.core.management import BaseCommand

from establishment.baseconfig.models import public_settings_cache, PublicGlobalSettings
from ...models import Forum


class Command(BaseCommand):
    def handle(self, *args, **options):
        public_settings_key = "GLOBAL_FORUM_ID"

        if hasattr(public_settings_cache, public_settings_key):
            global_forum_id = getattr(public_settings_cache, public_settings_key)
            try:
                forum = Forum.objects.get(id=global_forum_id)
            except:
                print("Global forum id is set, but the object is missing from DB")
                return
            print("Global forum already exists with id ", global_forum_id)
            return

        global_forum, created = Forum.objects.get_or_create(name="Forum")
        if created:
            print("Created global forum")
        else:
            print("Global forum already exists, just linking it")

        public_setting = PublicGlobalSettings(
            key=public_settings_key,
            value=global_forum.id,
            export=True,
            export_name=public_settings_key
        )
        public_setting.save()
