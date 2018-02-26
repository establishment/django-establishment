from django.contrib.postgres.fields import JSONField
from django.db import models, transaction
from django.conf import settings

from establishment.accounts.models import UserGroup, UserGroupMember, ReactionableMixin
from establishment.chat.models import Commentable
from establishment.content.models import Article
from establishment.funnel.stream import StreamObjectMixin


class UserSocialSettings(StreamObjectMixin):
    GROUP_ADDING_CHOICES = (
        (1, "Anyone"),
        (2, "Friends"),
        (3, "None"),
    )

    RECEIVE_FRIEND_REQUEST_CHOICES = (
        (1, "Anyone"),
        (2, "Friend of Friends"),
        (3, "None")
    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    allow_group_adding = models.IntegerField(default=2, choices=GROUP_ADDING_CHOICES)
    receive_friend_request = models.IntegerField(default=1)

    @classmethod
    def get_for_user(cls, user):
        user_social_settings, created = cls.objects.get_or_create(user=user)
        return user_social_settings


class Friendship(StreamObjectMixin):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")

    class Meta:
        unique_together = (("user1", "user2"), )

    # TODO: check on save that user1 < user2


class Follower(StreamObjectMixin):
    target = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="followers")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="following")

    class Meta:
        unique_together = (("target", "user"), )


class SocialGroup(StreamObjectMixin):
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    group = models.OneToOneField(UserGroup, on_delete=models.CASCADE)
    url_name = models.CharField(max_length=64, unique=True)

    def __str__(self):
        return "Social Group " + self.url_name

    def get_name(self):
        return self.group.name

    def to_json(self):
        d = super().to_json()
        d["name"] = self.get_name()
        return d

    def add_user(self, user):
        with transaction.atomic():
            user_group_member, created = UserGroupMember.objects.get_or_create(group_id=self.group_id, user=user)
            if created:
                social_user_member, created = SocialGroupMember.objects.get_or_create(group=self, user=user)
            else:
                social_user_member = SocialGroupMember.objects.get(group=self, user=user)

        # TODO: publish to group stream
        return social_user_member

    def remove_user(self, user):
        raise NotImplementedError()


class SocialGroupMember(StreamObjectMixin):
    group = models.ForeignKey(SocialGroup, on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    is_admin = models.BooleanField(default=False)
    # properties = JSONField(default=dict)

    class Meta:
        unique_together = (("group", "user"), )
        db_table = "SocialGroupMember"


class UserSocialPost(Commentable, ReactionableMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    groups = models.ManyToManyField(SocialGroup, related_name="user_posts")
    public = models.BooleanField(default=True)
    article = models.ForeignKey(Article)
    date_published = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return "UserSocialPost " + str(self.id) + " " + str(self.user_id)

    class Meta:
        db_table = "UserSocialPost"
