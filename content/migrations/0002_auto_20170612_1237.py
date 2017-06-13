# -*- coding: utf-8 -*-
# Generated by Django 1.11.2 on 2017-06-12 12:37
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='userfeedback',
            name='sender_email',
            field=models.EmailField(default='noreply@example.com', max_length=254),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='userfeedback',
            name='user',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]