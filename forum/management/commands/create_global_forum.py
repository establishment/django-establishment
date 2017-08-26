from django.core.management import BaseCommand

from ...models import Forum


class Command(BaseCommand):
    def handle(self, *args, **options):
        global_forum, created = Forum.objects.get_or_create(name="global")
        if created:
            print("Created global forum")
        else:
            print("Global forum already exists, skipping")
