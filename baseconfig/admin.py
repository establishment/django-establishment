from django.contrib import admin

from .models import PrivateGlobalSettings, PublicGlobalSettings, CommandInstance, CommandRun


class GlobalSettingsAdmin(admin.ModelAdmin):
    list_display = ("key", "value", "export", "namespace")
    list_filter = ("export", "namespace",)
    search_fields = ("key", "export_name", "namespace")


admin.site.register(PrivateGlobalSettings, GlobalSettingsAdmin)
admin.site.register(PublicGlobalSettings, GlobalSettingsAdmin)
admin.site.register(CommandInstance)
admin.site.register(CommandRun)
