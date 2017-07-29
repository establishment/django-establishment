import datetime
import json
import uuid

from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.postgres.fields import JSONField
from django.core import validators
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import models, transaction
from django.utils import timezone
from django.utils.crypto import get_random_string

from establishment.funnel.stream import StreamObjectMixin
from .utils import send_verification_mail, get_user_manager


def random_key():
    return uuid.uuid4().hex


class UnverifiedEmail(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, related_name="unverified_emails")
    email = models.EmailField(max_length=254)
    sent = models.DateTimeField(null=True)
    key = models.CharField(max_length=64, unique=True)

    class Meta:
        db_table = "UnverifiedEmail"
        unique_together = (("user", "email"),)

    @classmethod
    def create(cls, email, user=None):
        try:
            validators.validate_email(email)
        except ValidationError:
            return None
        key = get_random_string(64).lower()
        if EmailAddress.objects.filter(email__iexact=email).exists():
            return None
        try:
            unverified_email = UnverifiedEmail.objects.get(user=user, email__iexact=email)
        except UnverifiedEmail.DoesNotExist:
            unverified_email = UnverifiedEmail.objects.create(user=user, email=email, key=key)
        return unverified_email

    def verify(self):
        # TODO: raise exceptions here (ex. KeyExpired, AlreadyVerified)
        if self.key_expired():
            return None
        with transaction.atomic():
            make_primary = not EmailAddress.objects.filter(user=self.user, primary=True).exists()
            verified_email = EmailAddress.objects.create(user=self.user, email=self.email, primary=make_primary)
            if make_primary:
                self.user.email = self.email
                self.user.save()
            UnverifiedEmail.objects.filter(email__iexact=self.email).delete()
            return verified_email

    def key_expired(self):
        expiration_date = self.sent + datetime.timedelta(days=settings.EMAIL_CONFIRMATION_EXPIRE_DAYS)
        return expiration_date <= timezone.now()

    def send(self, request=None, signup=False):
        from establishment.funnel.throttle import UserActionThrottler

        email_throttler = UserActionThrottler(self.user or 0, "verify-email-" + self.email, 60 * 60, 3)
        if not email_throttler.increm():
            return
        send_verification_mail(request, self, signup)
        self.sent = timezone.now()
        self.save()

    def to_json(self):
        return {
            "id": self.id,
            "email": self.email,
            "verified": False,
            "primary": False
        }


class EmailAddressManager(models.Manager):
    def get_primary(self, user):
        try:
            return self.get(user=user, primary=True)
        except self.model.DoesNotExist:
            return None


class EmailAddress(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="emails")
    email = models.EmailField("Email address", unique=True, max_length=254)
    primary = models.BooleanField(default=False)

    objects = EmailAddressManager()

    class Meta:
        db_table = "EmailAddress"
        unique_together = [("user", "email")]

    def __str__(self):
        return "%s (%s)" % (self.email, self.user)

    def set_as_primary(self, conditional=False):
        old_primary = EmailAddress.objects.get_primary(self.user)
        if old_primary:
            if conditional:
                return False
            old_primary.primary = False
            old_primary.save()
        self.primary = True
        self.save()
        self.user.email = self.email
        self.user.save()
        return True

    def to_json(self):
        return {
            "id": self.id,
            "email": self.email,
            "verified": True,
            "primary": self.primary
        }


class SuperuserPermissionsMixin(models.Model):
    is_superuser = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def has_perm(self, perm, obj=None):
        return self.is_superuser

    def has_perms(self, perm_list, obj=None):
        return self.is_superuser

    def has_module_perms(self, app_label):
        return self.is_superuser


class AbstractStreamObjectUser(AbstractBaseUser, SuperuserPermissionsMixin, StreamObjectMixin):
    email = models.EmailField(unique=True, blank=False)
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    # TODO: deprecate the is_staff field
    is_staff = models.BooleanField(default=False, help_text="Designates whether the user can log into this admin site.")
    is_active = models.BooleanField(default=True, help_text="Designates whether this user should be treated as active. "
                                                            "Unselect this instead of deleting accounts.")
    date_joined = models.DateTimeField(default=timezone.now)
    locale_language = models.ForeignKey("localization.Language", default=1, on_delete=models.PROTECT)

    # These are for Django,
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    class Meta:
        abstract = True

    @classmethod
    def object_type(cls):
        return "user"

    @classmethod
    def get_object_stream_name(cls, object_id):
        return "user-" + str(object_id) + "-events"

    def get_stream_name(self):
        return "user-" + str(self.id) + "-events"

    # The next 2 methods are only needed by Django, no other real use for them
    def get_full_name(self):
        full_name = ("%s %s" % (self.first_name, self.last_name)).strip()
        if not full_name:
            full_name = self.email
        return full_name.strip()

    def get_short_name(self):
        if not self.username:
            return self.get_full_name()
        return self.username

    def to_json(self):
        result = {
            "id": self.id,
            "email": self.email,
            "firstName": self.first_name,
            "lastName": self.last_name,
            "dateJoined": self.date_joined,
            "isActive": self.is_active,
            "lastLogin": self.last_login,
            "hasPassword": self.has_usable_password(),
            "localeLanguageId": self.locale_language_id,
        }

        if self.is_staff:
            result["isStaff"] = True

        if self.is_superuser:
            result["isSuperUser"] = True

        return result


# TODO: get this from settings
MAX_USER_CUSTOM_SETTINGS_SIZE = 1 << 21


# TODO: rethink this with UserProfile in mind
class UserCustomSettings(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="custom_settings")
    settings = JSONField()
    # TODO: should probably just be the number of unread notifications
    last_read_notification = models.ForeignKey("accounts.UserNotification", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = "UserCustomSettings"

    def __str__(self):
        return "UserCustomSetting for user " + str(self.user_id)

    def set(self, key, value):
        key_chain = key.split(":")

        if len(key_chain) > 16:
            raise RuntimeError("Too many levels")

        if not self.settings:
            self.settings = {}

        current_dict = self.settings
        prev_dict = None

        for last_key in key_chain:
            if last_key not in current_dict:
                current_dict[last_key] = {}
            prev_dict = current_dict
            current_dict = current_dict[last_key]

        prev_dict[last_key] = value

        # Check at the end to see we don't store too much for this user
        if len(json.dumps(self.settings)) > MAX_USER_CUSTOM_SETTINGS_SIZE:
            raise RuntimeError("Settings too large!")

    def set_last_read_notification(self, user_notification):
        if user_notification.user_id != self.user_id:
            raise RuntimeError("Invalid notification for current user")
        self.last_read_notification = user_notification
        self.save(update_fields=["last_read_notification"])
        self.user.publish_event("lastReadNotification", {"lastReadNotificationId": self.last_read_notification_id})

    def to_json(self):
        return {
            "lastReadNotificationId": self.last_read_notification_id or 0,
            "customSettings": self.settings or {},
        }


class UserNotification(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    date_created = models.DateTimeField(auto_now=True)
    type = models.CharField(max_length=128)
    read = models.BooleanField(default=False)
    data = JSONField()

    class Meta:
        db_table = "UserNotification"

    # TODO: should use get_user_stream(user_id)
    def get_stream_name(self):
        return "user-" + str(self.user_id) + "-events"

    @classmethod
    def create_and_publish(cls, user, type, data):
        user_notification = cls(user=user, type=type, data=data)
        user_notification.save()
        user_notification.publish_create_event()

    def to_json(self):
        return {
            "id": self.id,
            "userId": self.user_id,
            "dateCreated": self.date_created,
            "data": self.data,
            "type": self.type
        }


class BaseUserSummary(object):
    def __init__(self, user):
        self.user = user

    @classmethod
    def object_type(cls):
        return "user"

    # TODO: rename to add_users_to_state
    @classmethod
    def add_users_to_state(cls, state, user_ids):
        users = get_user_manager().filter(id__in=user_ids)
        for user in users:
            state.add(cls(user))

    @property
    def id(self):
        return self.user.id


# Wrapper classes
class PublicUserSummary(BaseUserSummary):
    @classmethod
    def object_type(cls):
        return "publicuser"

    def to_json(self):
        # All public info from the user model (rating, etc) should go here
        rez = {
            "id": self.user.id,
            "name": ("%s %s" % (self.user.first_name, self.user.last_name)).strip(),
            "username": self.user.username,
            "displayName": self.user.display_name,
        }
        if self.user.is_superuser:
            rez["isAdmin"] = self.user.is_superuser
        return rez


class UserSummary(BaseUserSummary):
    def to_json(self):
        rez = self.user.to_json()
        rez["emails"] = self.user.get_all_emails()
        rez["receivesEmailAnnouncements"] = self.user.receives_email_announcements
        #TODO: validators and social should not be in here, should be in static
        rez["social"] = list(self.user.socialaccount_set.all().order_by("provider_instance"))
        rez.update(self.user.get_custom_settings(True).to_json())
        return rez


class UserReactionCollection(StreamObjectMixin):
    # Some cached fields
    upvotes_count = models.IntegerField(default=0)
    downvotes_count = models.IntegerField(default=0)

    class Meta:
        db_table = "UserReactionCollection"

    def calc_downvotes_count(self):
        return self.reactions.filter(type=0).count()

    def calc_upvotes_count(self):
        return self.reactions.filter(type=1).count()

    # TODO: only apply delta, this should be optimized
    def recalc_reactions_count(self):
        with transaction.atomic():
            self.upvotes_count = self.calc_upvotes_count()
            self.downvotes_count = self.calc_downvotes_count()
            self.save()

        return self.make_update_event()

    def set_user_reaction(self, user, reaction_type):
        if reaction_type == "dislike" or reaction_type == "downvote":
            reaction_type = 0
        if reaction_type == "like" or reaction_type == "upvote":
            reaction_type = 1
        reaction_instance, created = UserReaction.objects.get_or_create(reaction_collection=self, user=user, defaults={
            "type": reaction_type,
        })

        if not created and reaction_instance.type == reaction_type:
            # Nothing to do, it's the same as before
            return None

        if not created:
            reaction_instance.type = reaction_type
            reaction_instance.save()

        reaction_instance.publish_update_event(stream_names=user.get_stream_name())

        return self.recalc_reactions_count()

    def clear_user_reaction(self, user):
        try:
            reaction = UserReaction.objects.get(reaction_collection=self, user=user)
        except ObjectDoesNotExist as e:
            # There is not reaction to remove
            return {}

        reaction.delete_and_publish_event()
        return self.recalc_reactions_count()

    def to_json(self):
        return {
            "id": self.id,
            "downvotesCount": self.downvotes_count,
            "upvotesCount": self.upvotes_count,
        }

    def add_to_state(self, state):
        state.add(self)
        state.add(self.reactions.all())


class UserReaction(StreamObjectMixin):
    TYPE = (
        (0, "Downvote"),
        (1, "Upvote")
    )
    type = models.IntegerField(choices=TYPE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    reaction_collection = models.ForeignKey(UserReactionCollection, on_delete=models.CASCADE, related_name="reactions")

    class Meta:
        db_table = "UserReaction"
        unique_together = (("reaction_collection", "user"), )

    def get_stream_name(self):
        # TODO: this should be a static method in the user models
        return "user-" + str(self.user_id) + "-events"

    def to_json(self):
        return {
            "id": self.id,
            "type": self.type,
            "userId": self.user_id,
            "collectionId": self.reaction_collection_id,
        }


class ReactionableMixin(StreamObjectMixin):
    reaction_collection = models.OneToOneField(UserReactionCollection,
                                               related_name="+",
                                               on_delete=models.SET_NULL,
                                               null=True, blank=True)

    class Meta:
        abstract = True

    def set_reaction(self, user, reaction_type):
        events = []
        if not self.reaction_collection:
            # Create the reaction collection, if it doesn't exist
            # TODO: have a cleaner create syntax
            rc = UserReactionCollection()
            rc.save()
            self.reaction_collection = rc
            self.save(update_fields=["reaction_collection"])

            events.append(self.reaction_collection.make_create_event())
            events.append(self.make_event("createReactionCollection", {
                "reactionCollectionId": self.reaction_collection_id
            }))
        update_event = self.reaction_collection.set_user_reaction(user, reaction_type)
        if update_event:
            events.append(update_event)

        self.publish_event_raw(events)

    def clear_reaction(self, user):
        if not self.reaction_collection:
            return
        event = self.reaction_collection.clear_user_reaction(user)
        self.publish_event_raw(event)


# TODO: this should be somewhere else (utils?)
def add_own_user_reactions_to_state(state):
    """
    Add reactions that the current user made to ReactionCollections in the state
    """
    if not state.user or not state.user.is_authenticated:
        return

    reaction_collection_ids = set()

    for reaction_collection in state.all(UserReactionCollection):
        reaction_collection_ids.add(reaction_collection.id)
    for reaction in state.all(UserReaction):
        if reaction.user_id == state.user.id:
            reaction_collection_ids.remove(reaction.reaction_collection_id)

    if len(reaction_collection_ids) == 0:
        return

    state.add_all(UserReaction.objects.filter(user=state.user, reaction_collection_id__in=reaction_collection_ids))


class OwnerUserMixin(StreamObjectMixin):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    class Meta:
        abstract = True


class UserGroup(OwnerUserMixin):
    name = models.TextField(max_length=512, blank=True, null=True)

    class Meta:
        db_table = "UserGroup"

    @classmethod
    def get_groups_for_user(cls, user):
        # TODO: this should be done in a single DB query
        user_group_members = UserGroupMember.objects.filter(user=user).prefetch_related("group")
        return [member.group for member in user_group_members]


class UserGroupMember(models.Model):
    group = models.ForeignKey(UserGroup, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="custom_groups")
    muted = models.BooleanField(default=False)

    class Meta:
        db_table = "UserGroupMember"
        unique_together = ("group", "user")


class ObjectPermission(StreamObjectMixin):
    name = models.TextField(max_length=256, blank=True, null=True)
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="+")
    groups = models.ManyToManyField(UserGroup, related_name="+")

    class Meta:
        db_table = "ObjectPermissions"

    def add_user(self, user):
        self.users.add(user)

    def remove_user(self, user):
        self.users.remove(user)

    def add_group(self, group):
        self.groups.add(group)

    def remove_group(self, group):
        self.groups.remove(group)

    def allows(self, user):
        # TODO: this is inefficient, but good enough for now
        for allowed_user in self.users.all():
            if allowed_user.id == user.id:
                return True

        user_groups = UserGroup.get_groups_for_user(user)
        allowed_group_ids = set([group.id for group in user_groups])
        for allowed_group in self.groups.all():
            if allowed_group.id in allowed_group_ids:
                return True

        return False

    def to_json(self):
        return self.meta_to_json(include_many_to_many=True)


class ReadPermissionsMixin(StreamObjectMixin):
    read_permissions = models.ForeignKey(ObjectPermission, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        abstract = True

    def can_read(self, user):
        return self.read_permissions and self.read_permissions.allows(user)


class EditPermissionsMixin(StreamObjectMixin):
    edit_permissions = models.ForeignKey(ObjectPermission, on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        abstract = True

    def can_edit(self, user):
        return self.edit_permissions and self.edit_permissions.allows(user)
