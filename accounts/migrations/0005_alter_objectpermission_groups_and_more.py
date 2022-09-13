# Generated by Django 4.1 on 2022-09-13 14:57

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0004_auto_20211011_1228'),
    ]

    operations = [
        migrations.AlterField(
            model_name='objectpermission',
            name='groups',
            field=models.ManyToManyField(related_name='+', to='accounts.usergroup'),
        ),
        migrations.AlterField(
            model_name='objectpermission',
            name='users',
            field=models.ManyToManyField(related_name='+', to=settings.AUTH_USER_MODEL),
        ),
    ]
