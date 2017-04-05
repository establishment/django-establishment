from django.contrib import admin
from django.contrib.admin import SimpleListFilter
from django.core import urlresolvers

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


class UserReactionCollectionAdmin(admin.ModelAdmin):
    list_display = ("id", "upvotes_count", "downvotes_count")
    readonly_fields = ("users", )

    def users(self, obj):
        return ", ".join([str(reaction.user_id) for reaction in obj.reactions.all()])


class UserReactionAdmin(admin.ModelAdmin):
    list_display = ("id", "type", "user", "link_to_reaction_collection")
    raw_id_fields = ("user", "reaction_collection")
    search_fields = []

    def get_search_fields(self, request):
        return ["user__" + attr for attr in get_user_search_fields()]

    def link_to_reaction_collection(self, obj):
        link = urlresolvers.reverse("admin:accounts_userreactioncollection_change", args=[obj.reaction_collection_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "UserReactionCollection-" + str(obj.reaction_collection_id))
    link_to_reaction_collection.allow_tags = True


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
admin.site.register(UserReactionCollection, UserReactionCollectionAdmin)
admin.site.register(UserReaction, UserReactionAdmin)
admin.site.register(UserNotification, UserNotificationAdmin)