# Generated by Django 3.2.8 on 2021-10-11 12:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0006_auto_20170914_1037'),
    ]

    operations = [
        migrations.AlterField(
            model_name='tag',
            name='meta',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
