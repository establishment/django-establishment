from django.contrib import admin

from .models import PrivateGlobalSettings, PublicGlobalSettings


admin.site.register(PrivateGlobalSettings)
admin.site.register(PublicGlobalSettings)
