from django.contrib import admin
from django.contrib.admin import SimpleListFilter

from .utils import get_user_search_fields
from .models import EmailAddress, UnverifiedEmail, UserCustomSettings, EmailStatus, Email, \
    UserReaction, UserReactionCollection, UserNotification


class EmailAddressAdmin(admin.ModelAdmin):
    list_display = ("email", "user", "primary")
    list_filter = ("primary", )
    search_fields = []
    raw_id_fields = ("user",)

    def get_search_fields(self, request):
        return ["email"] + ["user__" + attr for attr in get_user_search_fields()]


class UnverifiedEmailAdmin(admin.ModelAdmin):
    list_display = ("email", "user", "sent", "key")
    list_filter = ("sent",)
    raw_id_fields = ("user",)


class SentEmailFilter(SimpleListFilter):
    title = "email"
    parameter_name = "email"

    def lookups(self, request, model_admin):
        sent_emails = Email.objects.all()
        return [(email.id, email.subject) for email in sent_emails]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(emails__has_key=self.value())
        else:
            return queryset


class EmailStatusAdmin(admin.ModelAdmin):
    list_display = ("user", "emails")
    list_filter = (SentEmailFilter,)
    raw_id_fields = ("user",)
    search_fields = []

    def get_search_fields(self, request):
        return ["user__" + attr for attr in get_user_search_fields()]


class EmailAdmin(admin.ModelAdmin):
    list_display = ("subject", "key")
    search_fields = ("subject",)


class UserNotificationAdmin(admin.ModelAdmin):
    list_display = ("user", "type", "data", "read")
    list_filter = ("type", "read")
    search_fields = []

    def get_search_fields(self, request):
        return ["type"] + ["user__" + attr for attr in get_user_search_fields()]


admin.site.register(EmailAddress, EmailAddressAdmin)
admin.site.register(UnverifiedEmail, UnverifiedEmailAdmin)
admin.site.register(UserCustomSettings)
admin.site.register(EmailStatus, EmailStatusAdmin)
admin.site.register(Email, EmailAdmin)
admin.site.register(UserReactionCollection)
admin.site.register(UserReaction)
admin.site.register(UserNotification, UserNotificationAdmin)