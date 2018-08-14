from django.contrib import admin

from .models import EmailTemplate, EmailStatus, EmailGateway, EmailCampaign, EmailNewsletterSubscription


class EmailNewsletterSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "email", "ip_address", "active", "subscription_time")
    search_fields = ("name", "email", "ip_address")


admin.site.register(EmailStatus)
admin.site.register(EmailCampaign)
admin.site.register(EmailTemplate)
admin.site.register(EmailGateway)
admin.site.register(EmailNewsletterSubscription, EmailNewsletterSubscriptionAdmin)
