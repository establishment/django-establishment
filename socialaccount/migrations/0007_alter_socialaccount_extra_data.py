# Generated by Django 3.2.8 on 2021-10-11 12:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('socialaccount', '0006_auto_20170728_1722'),
    ]

    operations = [
        migrations.AlterField(
            model_name='socialaccount',
            name='extra_data',
            field=models.JSONField(default=dict),
        ),
    ]
