# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-05-10 16:38
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('emailing', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='emailcampaign',
            name='is_announcement',
            field=models.BooleanField(default=True),
        ),
    ]
