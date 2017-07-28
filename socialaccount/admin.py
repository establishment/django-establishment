from django.contrib import admin
from django import forms

from establishment.accounts.utils import get_user_search_fields

from .models import SocialApp, SocialAccount, SocialToken, SocialProvider


class SocialAppForm(forms.ModelForm):
    class Meta:
        model = SocialApp
        exclude = []
        widgets = {
            "client_id": forms.TextInput(attrs={"size": "100"}),
            "key": forms.TextInput(attrs={"size": "100"}),
            "secret": forms.TextInput(attrs={"size": "100"})
        }


class SocialAppAdmin(admin.ModelAdmin):
    form = SocialAppForm
    list_display = ("name", "provider_instance",)
    filter_horizontal = ("sites",)


class SocialAccountAdmin(admin.ModelAdmin):
    search_fields = []
    raw_id_fields = ("user",)
    list_display = ("user", "uid", "provider_instance")
    list_filter = ("provider_instance",)

    def get_search_fields(self, request):
        return ["user__" + attr for attr in get_user_search_fields()]


class SocialTokenAdmin(admin.ModelAdmin):
    raw_id_fields = ("app", "account",)
    list_display = ("app", "account", "truncated_token", "expires_at")
    list_filter = ("app", "app__provider_instance", "expires_at")

    def truncated_token(self, token):
        max_chars = 40
        ret = token.token
        if len(ret) > max_chars:
            ret = ret[0:max_chars] + "...(truncated)"
        return ret
    truncated_token.short_description = "Token"


admin.site.register(SocialApp, SocialAppAdmin)
admin.site.register(SocialToken, SocialTokenAdmin)
admin.site.register(SocialAccount, SocialAccountAdmin)
admin.site.register(SocialProvider)
