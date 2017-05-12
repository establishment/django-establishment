from django.contrib import admin

from establishment.localization.models import *

admin.site.register(Language)
admin.site.register(Jurisdiction)
admin.site.register(TranslationKey)
admin.site.register(TranslationEntry)
admin.site.register(Country)
