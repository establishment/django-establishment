# -*- coding: utf-8 -*-
# Generated by Django 1.10.5 on 2017-03-03 19:27
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('content', '0001_initial'),
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlogEntry',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('url_name', models.CharField(max_length=256, unique=True)),
                ('visible', models.BooleanField(default=False)),
                ('article', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, to='content.Article')),
                ('discussion', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='chat.GroupChat')),
            ],
            options={
                'db_table': 'BlogEntry',
            },
        ),
    ]
