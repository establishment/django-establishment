from django.db import migrations


# Language foreign keys elsewhere default to id 1
def create_default_language(apps, schema_editor):
    Language = apps.get_model("localization", "Language")
    if not Language.objects.filter(id=1).exists():
        Language.objects.create(name="English", local_name="English", iso_code="eng")


class Migration(migrations.Migration):

    dependencies = [
        ("localization", "0003_language_icon_alter_language_local_name"),
    ]

    operations = [
        migrations.RunPython(create_default_language, migrations.RunPython.noop),
    ]
