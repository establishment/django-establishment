import uuid
from datetime import datetime

from django.conf import settings
from django.db import models
from django.db.models import F

from establishment.funnel.stream import StreamObjectMixin
from establishment.localization.models import Language


def random_key():
    return uuid.uuid4().hex


class EmailGateway(StreamObjectMixin):
    name = models.CharField(max_length=256, unique=True)
    host = models.CharField(max_length=256)
    port = models.IntegerField(default=587)
    use_tls = models.BooleanField(default=True)
    username = models.CharField(max_length=256)
    password = models.CharField(max_length=256) # TODO: If this is null, it means we want to prompt

    class Meta:
        db_table = "EmailGateway"

    def __str__(self):
        return "Email Gateway " + str(self.host) + ":" + str(self.port)

    def get_connection(self):
        from django.core.mail import get_connection
        return get_connection(
            host=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            use_tls=self.use_tls
        )


class EmailCampaign(StreamObjectMixin):
    name = models.CharField(max_length=256)
    system_use = models.BooleanField(default=False)
    from_address = models.CharField(max_length=512, null=True, blank=True)
    gateway = models.ForeignKey(EmailGateway, null=True, blank=True)
    is_announcement = models.BooleanField(default=True)

    class Meta:
        db_table = "EmailCampaign"

    def __str__(self):
        return "Email Campaign " + self.name

    def send_to_user(self, user, *args, **kwargs):
        email_template = self.templates.first()
        return email_template.send_to_user(user, *args, **kwargs)


class EmailTemplate(StreamObjectMixin):
    subject = models.CharField(max_length=256)
    plaintext = models.TextField(max_length=1 << 17)
    html = models.TextField(max_length=1 << 17)
    campaign = models.ForeignKey(EmailCampaign, related_name="templates")
    version = models.IntegerField(default=1)
    language = models.ForeignKey(Language, default=1)
    plaintext = models.TextField(max_length=1 << 17)
    gateway = models.ForeignKey(EmailGateway, null=True, blank=True)

    class Meta:
        db_table = "EmailTemplate"
        unique_together = (("campaign", "version", "language"),)

    def __str__(self):
        return "Email Template " + self.subject + " version " + str(self.version)

    def get_connection(self):
        if self.gateway:
            return self.gateway.get_connection()
        if self.campaign.gateway:
            return self.campaign.gateway.get_connection()

        from django.core import mail
        return mail.get_connection()

    def get_from_address(self):
        return self.campaign.from_address or settings.DEFAULT_FROM_EMAIL

    def send_to_user(self, user, context_dict={}):
        from django.template import Context, Template
        from django.core.mail import EmailMultiAlternatives

        if self.campaign.is_announcement and not user.receives_email_announcements:
            return False

        if EmailStatus.objects.filter(user=user, campaign=self.campaign).first():
            # We have already sent this email to the user
            # TODO: need an explicit overwrite for this?
            return False

        tracking_key = random_key()

        context = {
            "user": user,
            "unsubscribe_key": user.email_unsubscribe_key,
            "tracking_key": tracking_key,
        }

        context.update(context_dict)

        context = Context(context)

        subject = Template(self.subject).render(context)
        plaintext_message = Template(self.plaintext).render(context)
        html_message = Template(self.html).render(context)

        with self.get_connection() as connection:
            email = EmailMultiAlternatives(subject,
                                           plaintext_message,
                                           self.get_from_address(),
                                           [user.email],
                                           connection=connection)
            email.attach_alternative(html_message, 'text/html')
            email.send(fail_silently=False)

        email_status = EmailStatus(user=user, campaign=self.campaign, template=self, key=tracking_key)
        email_status.save()
        return True


class EmailStatus(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="+")
    campaign = models.ForeignKey(EmailCampaign, related_name="+")
    template = models.ForeignKey(EmailTemplate, related_name="+")
    key = models.CharField(max_length=64, default=random_key, unique=True, null=True, blank=True)
    time_sent = models.DateTimeField(auto_now_add=True)
    time_first_read = models.DateTimeField(null=True, blank=True)
    time_last_read = models.DateTimeField(null=True, blank=True)
    read_count = models.IntegerField(default=0)

    class Meta:
        db_table = "EmailStatus"
        unique_together = (("user", "campaign"), )

    def mark_read(self, timestamp=datetime.now()):
        self.read_count = F("read_count") + 1
        if not self.time_first_read:
            self.time_first_read = timestamp
        self.time_last_read = timestamp
        self.save(update_fields=["read_count", "time_first_read", "time_last_read"])
        self.refresh_from_db()
