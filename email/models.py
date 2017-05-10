import uuid
from datetime import timezone

from django.conf import settings
from django.db import models
from django.db.models import F

from establishment.funnel.stream import StreamObjectMixin


def random_key():
    return uuid.uuid4().hex


class EmailGateway(StreamObjectMixin):
    class Meta:
        abstract = True

    def get_connection(self):
        return None


class EmailCampaign(StreamObjectMixin):
    name = models.CharField(max_length=256)
    system_use = models.BooleanField(default=False)
    gateway = models.ForeignKey(EmailGateway, null=True, blank=True)

    class Meta:
        db_table = "EmailCampaign"


class EmailTemplate(StreamObjectMixin):
    subject = models.CharField(max_length=256)
    plaintext = models.TextField(max_length=1 << 17)
    html = models.TextField(max_length=1 << 17)
    campaign = models.ForeignKey(EmailCampaign, related_name="templates")
    version = models.IntegerField(default=1)
    language = models.ForeignKey(default=1)
    plaintext = models.TextField(max_length=1 << 17)
    gateway = models.ForeignKey(EmailGateway, null=True, blank=True)

    class Meta:
        db_table = "EmailTemplate"
        unique_together = (("campaign", "version", "language"),)

    def get_connection(self):
        if self.gateway:
            return self.gateway.get_connection()
        if self.campaign.gateway:
            return self.campaign.gateway.get_connection()

        from django.core import mail
        return mail.get_connection()

    def send_to_user(self, user, is_announcement, context_dict={}):
        from django.template import Context, Template
        from django.core.mail import EmailMultiAlternatives

        if is_announcement and not user.receives_email_announcements:
            return False

        if EmailStatus.objects.filter(user=user, campaign=self.campaign).first():
            # We have already sent this email to the user
            # TODO: need an explicit overwrite for this?
            return False

        tracking_key = random_key()

        context = Context({
            "user": user,
            "unsubscribe_key": user.email_unsubscribe_key,
            "tracking_key": tracking_key,
        }.update(context_dict))

        plaintext_message = Template(self.plaintext).render(context)
        html_message = Template(self.html).render(context)

        with self.get_connection() as connection:
            email = EmailMultiAlternatives(self.subject,
                                           plaintext_message,
                                           "news@mail.csacademy.com (CS Academy)", # TODO mciucu
                                           [user.email],
                                           connection=connection)
            email.attach_alternative(html_message, 'text/html')
            email.send(fail_silently=False)

        email_status = EmailStatus(user=user, compaign=self.campaign, template=self, key=tracking_key)
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

    def mark_read(self, timestamp=timezone.now()):
        self.read_count = F("read_count") + 1
        if not self.time_first_read:
            self.time_first_read = timestamp
        self.time_last_read = timestamp
        self.save(update_fields=["read_count", "time_first_read", "time_last_read"])
        self.refresh_from_db()
