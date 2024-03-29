# Generated by Django 3.2.8 on 2021-10-11 12:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_messagethread_last_activity'),
    ]

    operations = [
        migrations.AlterField(
            model_name='messageinstance',
            name='metadata',
            field=models.JSONField(blank=True),
        ),
        migrations.AlterField(
            model_name='messagethread',
            name='metadata',
            field=models.JSONField(blank=True),
        ),
        migrations.AlterField(
            model_name='privatechat',
            name='first_unread_message',
            field=models.JSONField(default=dict),
        ),
    ]
