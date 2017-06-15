from django.contrib import admin

from .models import PrivateGlobalSettings, PublicGlobalSettings, CommandInstance, CommandRun


class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "namespace")
    list_filter = ("namespace",)
    search_fields = ("key", "namespace")


admin.site.register(PrivateGlobalSettings, GlobalSettingsAdmin)
admin.site.register(PublicGlobalSettings, GlobalSettingsAdmin)
admin.site.register(CommandInstance)
admin.site.register(CommandRun)
