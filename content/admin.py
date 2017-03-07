from django.contrib import admin

from establishment.accounts.utils import get_user_search_fields
from establishment.content.models import *


class UserFeedbackAdmin(admin.ModelAdmin):
    list_display = ("user", "message")
    search_fields = []

    def get_search_fields(self, request):
        return ["message"] + ["user__" + attr for attr in get_user_search_fields()]


admin.site.register(Tag)
admin.site.register(TermDefinition)
admin.site.register(Article)
admin.site.register(ArticleEdit)
admin.site.register(UserFeedback, UserFeedbackAdmin)
