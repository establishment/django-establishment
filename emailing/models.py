import uuid
from datetime import datetime

from django.conf import settings
from django.db import models
from django.db.models import F

from establishment.funnel.stream import StreamObjectMixin
from establishment.localization.models import Language
from establishment.funnel.redis_stream import RedisStreamPublisher


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

    def get_event(self, event_type="update"):
        return {
            "objectId": self.id,
            "objectType": self.__class__.object_type(),
            "type": event_type,
            "data": self,
        }

    def publish_update_event(self, event_type="updateOrCreate", extra=None, extra_stream_names=None):
        event = self.get_event(event_type=event_type)
        if extra:
            event.update(extra)
        stream_name = "admin-email-manager"
        RedisStreamPublisher.publish_to_stream(stream_name, event)
        if extra_stream_names:
            for extra_stream_name in extra_stream_names:
                RedisStreamPublisher.publish_to_stream(extra_stream_name, event)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "host": self.host,
            "port": self.port,
            "useTLS": self.use_tls,
            "username": self.username
        }


class EmailCampaign(StreamObjectMixin):
    name = models.CharField(max_length=256, unique=True)
    from_address = models.CharField(max_length=512, null=True, blank=True)
    gateway = models.ForeignKey(EmailGateway, on_delete=models.PROTECT, null=True, blank=True)
    is_newsletter = models.BooleanField(default=True) # TODO: rename to is_newsletter?
    manual_send_only = models.BooleanField(default=False)
    # TODO: should have a field clear_existing_status

    class Meta:
        db_table = "EmailCampaign"

    def __str__(self):
        return "Email Campaign " + self.name

    def send_to_user(self, user, *args, **kwargs):
        # TODO: try to find here if there's a template for the user's language
        email_template = self.templates.first()
        return email_template.send_to_user(user, *args, **kwargs)

    def get_event(self, event_type="update"):
        return {
            "objectId": self.id,
            "objectType": self.__class__.object_type(),
            "type": event_type,
            "data": self,
        }

    def get_emails_sent_count(self):
        return EmailStatus.objects.all().filter(campaign_id=self.id).count()

    def get_emails_read_count(self, min_count=1):
        return EmailStatus.objects.all().filter(campaign_id=self.id, read_count__gte=min_count).count()

    def publish_update_event(self, event_type="updateOrCreate", extra=None, extra_stream_names=None):
        event = self.get_event(event_type=event_type)
        if extra:
            event.update(extra)
        stream_name = "admin-email-manager"
        RedisStreamPublisher.publish_to_stream(stream_name, event)
        if extra_stream_names:
            for extra_stream_name in extra_stream_names:
                RedisStreamPublisher.publish_to_stream(extra_stream_name, event)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "fromAddress": self.from_address,
            "gatewayId": self.gateway_id,
            "isNewsletter": self.is_newsletter,
            "emailsSent": self.get_emails_sent_count(),
            "emailsRead": self.get_emails_read_count()
        }


def html_to_plaintext(html):
    # TODO: this doesn't support links.
    # TODO: First replace <a href="link">Text</a> with Text ( link )
    from bs4 import BeautifulSoup
    return BeautifulSoup(html).get_text()


class EmailTemplate(StreamObjectMixin):
    subject = models.CharField(max_length=256)
    html = models.TextField(max_length=1 << 17)
    plaintext = models.TextField(max_length=1 << 17, null=True, blank=True)
    campaign = models.ForeignKey(EmailCampaign, on_delete=models.CASCADE, related_name="templates")
    version = models.IntegerField(default=1)
    language = models.ForeignKey(Language, on_delete=models.PROTECT, default=1)
    gateway = models.ForeignKey(EmailGateway, on_delete=models.PROTECT, null=True, blank=True)

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

    def get_event(self, event_type="update"):
        return {
            "objectId": self.id,
            "objectType": self.__class__.object_type(),
            "type": event_type,
            "data": self,
        }

    def publish_update_event(self, event_type="updateOrCreate", extra=None, extra_stream_names=None):
        event = self.get_event(event_type=event_type)
        if extra:
            event.update(extra)
        stream_name = "admin-email-manager"
        RedisStreamPublisher.publish_to_stream(stream_name, event)
        if extra_stream_names:
            for extra_stream_name in extra_stream_names:
                RedisStreamPublisher.publish_to_stream(extra_stream_name, event)

    def send_to_user(self, user, context_dict={}, clear_existing_status=False):
        from django.template import Context, Template
        from django.core.mail import EmailMultiAlternatives

        if self.campaign.is_newsletter and not user.receives_email_announcements:
            return False

        existing_email_status = EmailStatus.objects.filter(user=user, campaign=self.campaign).first()

        if existing_email_status:
            # We have already sent this email to the user
            if clear_existing_status:
                existing_email_status.delete()
            else:
                return False

        tracking_key = random_key()

        context = {
            "user": user,
            "unsubscribe_key": user.email_unsubscribe_key,
            "tracking_key": tracking_key,
        }

        # TODO: Add unsubscribe link to the model
        unsubscribe_link = "https://csacademy.com/accounts/email_unsubscribe/" + user.email_unsubscribe_key

        context.update(context_dict)

        context = Context(context)

        subject = Template(self.subject).render(context)
        html_message = Template(self.html).render(context) if self.html else None

        if self.plaintext and len(self.plaintext.strip()) > 0:
            plaintext_message = Template(self.plaintext).render(context)
        else:
            plaintext_message = html_to_plaintext(html_message)

        with self.get_connection() as connection:
            email = EmailMultiAlternatives(subject,
                                           plaintext_message,
                                           self.get_from_address(),
                                           [user.email],
                                           connection=connection,
                                           headers={"List-Unsubscribe": "<" + unsubscribe_link + ">"})
            if html_message:
                email.attach_alternative(html_message, "text/html")
            email.send(fail_silently=False)

        email_status = EmailStatus(user=user, campaign=self.campaign, template=self, key=tracking_key)
        email_status.save()
        return True

    def to_json(self):
        return {
            "id": self.id,
            "subject": self.subject,
            "html": self.html,
            "plaintext": self.plaintext,
            "campaignId": self.campaign_id,
            "version": self.version,
            "languageId": self.language_id,
            "gatewayId": self.gateway_id
        }


class EmailStatus(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    campaign = models.ForeignKey(EmailCampaign, on_delete=models.PROTECT, related_name="+")
    template = models.ForeignKey(EmailTemplate, on_delete=models.CASCADE, related_name="+")
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

    def get_event(self, event_type="update"):
        return {
            "objectId": self.id,
            "objectType": self.__class__.object_type(),
            "type": event_type,
            "data": self,
        }

    def publish_update_event(self, event_type="updateOrCreate", extra=None, extra_stream_names=None):
        event = self.get_event(event_type=event_type)
        if extra:
            event.update(extra)
        stream_name = "admin-email-manager"
        RedisStreamPublisher.publish_to_stream(stream_name, event)
        if extra_stream_names:
            for extra_stream_name in extra_stream_names:
                RedisStreamPublisher.publish_to_stream(extra_stream_name, event)

    def to_json(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "campaignId": self.campaign_id,
            "templateId": self.template_id,
            "timeSent": self.time_sent,
            "timeFirstRead": self.time_first_read,
            "timeLastRead": self.time_last_read,
            "readCount": self.read_count
        }
