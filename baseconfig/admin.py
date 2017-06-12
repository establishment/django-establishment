from django.contrib import admin

from .models import PrivateGlobalSettings, PublicGlobalSettings, CommandInstance, CommandRun

admin.site.register(PrivateGlobalSettings)
admin.site.register(PublicGlobalSettings)
admin.site.register(CommandInstance)
admin.site.register(CommandRun)
