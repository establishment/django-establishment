from django.contrib import admin

from .models import EmailTemplate, EmailStatus, EmailGateway, EmailCampaign

admin.site.register(EmailStatus)
admin.site.register(EmailCampaign)
admin.site.register(EmailTemplate)
admin.site.register(EmailGateway)
