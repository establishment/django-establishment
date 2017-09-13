from django.contrib import admin
from django.utils.translation import ugettext_lazy as _

from establishment.accounts.utils import get_user_search_fields
from establishment.content.models import *


class UserFeedbackAdmin(admin.ModelAdmin):
    list_display = ("user", "message")
    search_fields = []

    def get_search_fields(self, request):
        return ["message"] + ["user__" + attr for attr in get_user_search_fields()]


class QuestionnaireQuestionInline(admin.TabularInline):
    model = QuestionnaireQuestion
    extra = 0

    fields = ("type", "other_choice", "priority", "text")


class QuestionnaireAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "visible", "owner")
    raw_id_fields = ("owner", )
    inlines = (QuestionnaireQuestionInline, )

    fieldsets = (
        (_('GENERAL INFO'), {"fields": ("owner", "name", "visible")}),
    )


class QuestionnaireQuestionOptionInline(admin.TabularInline):
    model = QuestionnaireQuestionOption
    extra = 0


class QuestionnaireQuestionAdmin(admin.ModelAdmin):
    list_display = ("id", "questionnaire", "text")
    inlines = (QuestionnaireQuestionOptionInline, )


class QuestionnaireQuestionResponseInline(admin.TabularInline):
    model = QuestionnaireQuestionResponse
    extra = 0


class QuestionnaireInstanceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "questionnaire")
    raw_id_fields = ("user", )
    inlines = (QuestionnaireQuestionResponseInline, )


admin.site.register(Tag)
admin.site.register(TermDefinition)
admin.site.register(Article)
admin.site.register(ArticleEdit)
admin.site.register(UserFeedback, UserFeedbackAdmin)
admin.site.register(Questionnaire, QuestionnaireAdmin)
admin.site.register(QuestionnaireQuestion, QuestionnaireQuestionAdmin)
admin.site.register(QuestionnaireInstance, QuestionnaireInstanceAdmin)
admin.site.register(QuestionnaireQuestionOption)
