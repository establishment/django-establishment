# -*- coding: utf-8 -*-
# Generated by Django 1.11.5 on 2017-09-12 16:59
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_auto_20170908_2321'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='questionnairequestionresponse',
            name='choice',
        ),
        migrations.AddField(
            model_name='questionnairequestion',
            name='other_choice',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='questionnairequestionresponse',
            name='choices',
            field=models.ManyToManyField(blank=True, to='content.QuestionnaireQuestionOption'),
        ),
        migrations.AlterField(
            model_name='questionnairequestion',
            name='type',
            field=models.IntegerField(choices=[(1, 'Plain text'), (2, 'Single choice'), (3, 'Multiple choice')], default=1),
        ),
    ]
