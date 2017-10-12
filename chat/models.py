import re
from datetime import datetime

from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.utils import timezone

from establishment.accounts.models import ReactionableMixin
from establishment.chat.errors import ChatError
from establishment.errors.errors import BaseError
from establishment.funnel.nodews_meta import NodeWSMeta
from establishment.funnel.stream import register_stream_handler, StreamObjectMixin
from establishment.webapp.state import State


class MessageThread(StreamObjectMixin):
    stream_name = models.CharField(max_length=256)
    messages_editable = models.BooleanField(default=False)
    metadata = JSONField(blank=True)
    muted = models.BooleanField(default=False)
    markup_enabled = models.BooleanField(default=True) #TODO: should be in metadata
    last_activity = models.DateTimeField(default=datetime.fromtimestamp(0))

    class Meta:
        db_table = "MessageThread"

    def __str__(self):
        return "MessageThread-" + str(self.id)

    def can_post(self, user, message_content):
        if len(message_content) > (1 << 14):
            return False, ChatError.INVALID_MESSAGE_CONTENT
        return True, "Ok"

    # def to_json(self):
    #     return {
    #         "id": self.id,
    #         "streamName": self.stream_name,
    #         "meta": self.metadata,
    #         "muted": self.muted,
    #         "markupEnabled": self.markup_enabled,
    #         "lastActivity": self.last_activity,
    #     }

    def create_message_from_request(self, request, stream_names=None):
        user = request.user
        content = request.POST["message"]

        virtual_id = request.POST.get("virtualId", None)

        if virtual_id and len(virtual_id) > 128:
            return None, ChatError.INVALID_MESSAGE_CONTENT

        message = self.create_message(user, content, virtual_id=virtual_id, stream_names=stream_names)
        return message, State.from_objects(message).to_response(extra={"messageId": message.id})

    def create_message(self, user, content, metadata={}, virtual_id=None, stream_names=None):
        message = MessageInstance(message_thread=self, user=user, content=content, metadata=metadata)
        message.save()
        message.publish("create", virtual_id=virtual_id, stream_names=stream_names)
        self.set_last_activity(message.time_added)
        return message

    def set_last_message_read(self, user, message_instance, stream_names=None):
        self.metadata["lastReadMessage"][user.id] = message_instance.id
        self.save(update_fields=["metadata"])
        # TODO: right now we send the entire metadata, just send the delta
        self.publish_event("lastMessageRead", {"metadata": self.metadata}, stream_names=stream_names)

    def set_last_message(self, message_instance, stream_names=None):
        self.metadata["lastMessageInstanceId"] = message_instance.id
        self.save(update_fields=["metadata"])
        # TODO: right now we send the entire metadata, just send the delta
        self.publish_event("lastMessageInstance", {"metadata": self.metadata}, stream_names=stream_names)

    def set_last_activity(self, timestamp):
        self.last_activity = timestamp
        self.save(update_fields=["last_activity"])

    def get_stream_name(self):
        return self.stream_name

    def get_last_message(self):
        return self.messages.order_by("-id").first()

    def set_muted(self, muted, stream_names=None):
        self.muted = muted
        self.save()
        self.publish_event("muted", {"muted": self.muted}, stream_names=stream_names)


class MessageInstance(ReactionableMixin):
    message_thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    time_added = models.DateTimeField(auto_now_add=True)
    content = models.TextField(max_length=(1 << 14))
    hidden = models.BooleanField(default=False)
    metadata = JSONField(blank=True)

    class Meta:
        db_table = "MessageInstance"

    def __str__(self):
        return "MessageInstance-" + str(self.id)

    def get_stream_name(self):
        return self.message_thread.get_stream_name()

    def edit(self, user, content):
        #TODO: should be wrapped in an atomic transaction?
        if "edits" not in self.metadata:
            self.metadata["edits"] = []
        edits = self.metadata["edits"]
        if not edits:
            edits = [{
                "userId": self.user_id,
                "date": self.time_added.timestamp(),
                "content": self.content
            }]

        edits.append({
            "userId": user.id,
            "date": timezone.now().timestamp(),
            "content": content
        })

        # Keep a maximum of 32 edits in history
        edits = edits[-32:]

        self.metadata["edits"] = edits
        self.content = content
        self.save()
        self.publish("messageEdit")

    def get_votes_balance(self):
        if not self.reaction_collection:
            return 0
        return self.reaction_collection.upvotes_count - self.reaction_collection.downvotes_count

    def hide_message(self):
        self.hidden = True
        self.save()
        self.publish_message_delete()

    def delete_message(self):
        self.publish_message_delete()
        self.delete()

    def to_json(self):
        result = {
            "id": self.id,
            "userId": self.user_id,
            "timeAdded": self.time_added,
            "content": self.content,
            "meta": self.metadata,
            "messageThreadId": self.message_thread_id,
        }

        if self.reaction_collection_id:
            result["reactionCollectionId"] = self.reaction_collection_id

        if self.hidden:
            result["hidden"] = self.hidden

        return result

    def add_to_state(self, state, user=None):
        state.add(self)
        if self.reaction_collection:
            state.add(self.reaction_collection)

    def publish(self, event_type="message", virtual_id=None, stream_names=None):
        extra = {}
        if virtual_id:
            extra["virtualId"] = virtual_id
        return self.publish_event(event_type, self, extra=extra, stream_names=stream_names)

    def publish_message_delete(self):
        return self.publish_event("messageDelete", {})


# Temp testing class
class MessageThreadWrapperMixin(StreamObjectMixin):
    message_thread = models.OneToOneField(MessageInstance, on_delete=models.CASCADE, related_name="+")

    def get_stream_name(self):
        return self.message_thread.stream_name

    class Meta:
        abstract = True


# Temp testing class
class LastReadMessageMixin(StreamObjectMixin):
    last_read_message = JSONField(default=dict)

    class Meta:
        abstract = True

    def set_last_read_message(self, user, message_instance, publish_event=True):
        if message_instance.message_thread_id != self.message_thread_id:
            raise RuntimeError("Invalid message instance")

        user_id = str(user.id)
        if user_id in self.first_unread_message:
            if int(self.first_unread_message[user_id]) >= message_instance.id:
                raise RuntimeError("Already read to further messageId")

        self.first_unread_message[user_id] = message_instance.id

        self.save(update_fields=["last_read_message"])

        if publish_event:
            # TODO: only publish the diff
            self.publish_event("updateLastReadMessage", {
                "lastReadMessage": self.last_read_message
            })

    def to_json(self):
        result = super().to_json()

        result.update({
            "lastReadMessage": self.last_read_message
        })

        return result


# TODO: should PrivateChat and Group chat inherit from a common class?
class PrivateChat(StreamObjectMixin):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    message_thread = models.OneToOneField(MessageThread, on_delete=models.CASCADE, related_name="+")
    first_unread_message = JSONField(default=dict)

    class Meta:
        db_table = "PrivateChat"
        #TODO: should only allow user1_id < user2_id, add custom validation
        unique_together = ("user1", "user2")

    def __str__(self):
        return "PrivateChat-" + str(self.id) + " <" + str(self.user1_id) + "," + str(self.user2_id) + ">"

    def get_stream_name(self):
        return self.get_user_streams()

    def get_user_streams(self):
        stream_names = ["user-" + str(self.user1_id) + "-events"]
        if self.user1_id != self.user2_id:
            stream_names.append("user-" + str(self.user2_id) + "-events")
        return stream_names

    def get_other_user(self, user):
        if user.id == self.user1_id:
            return self.user2
        else:
            return self.user1

    @classmethod
    def get(cls, user1, user2):
        if user2.id < user1.id:
            user1, user2 = user2, user1
        return cls.objects.filter(user1=user1, user2=user2).first()

    @classmethod
    def get_or_create(cls, user1, user2):
        if user2.id < user1.id:
            user1, user2 = user2, user1
        try:
            chat = cls.objects.get(user1=user1, user2=user2)
            return chat
        except:  # TODO: only catch missing
            pass

        temp_stream_name = "temp-private-stream-" + str(user1.id) + "-" + str(user2.id)
        message_thread = MessageThread(stream_name=temp_stream_name, metadata={})
        message_thread.save()

        try:
            # TODO: atomic!
            private_chat = cls(user1=user1, user2=user2, message_thread=message_thread)
            private_chat.save()
            private_chat.message_thread.save()
            return private_chat
        except:  # TODO: catch except for duplicate only
            message_thread.delete()
            return cls.objects.get(user1=user1, user2=user2)

    def can_post(self, user, message_content):
        if user.id != self.user1_id and user.id != self.user2_id:
            return False, BaseError.NOT_ALLOWED
        # TODO: fix hardcoded constant
        if len(message_content) > 1 << 14:
            return False, ChatError.INVALID_MESSAGE_CONTENT
        # TODO: add case when a user wants to mute a conversation
        return self.message_thread.can_post(user, message_content)

    # TODO: Nope!
    def create_message_from_request(self, request):
        stream_names = self.get_user_streams()
        return self.message_thread.create_message_from_request(request, stream_names=stream_names)

    def to_json(self):
        return {
            "id": self.id,
            "messageThreadId": self.message_thread_id,
            "user1Id": self.user1_id,
            "user2Id": self.user2_id,
            "firstUnreadMessage": self.first_unread_message,
        }

    def update_first_unread_message(self):
        self.save(update_fields=["first_unread_message"])
        self.publish_event("updateFirstUnreadMessage", {
                "firstUnreadMessage": self.first_unread_message
            }, stream_names=self.get_user_streams())

    def mark_user_to_read(self, user_id, message_instance):
        user_id_str = str(user_id)
        if user_id_str not in self.first_unread_message:
            self.first_unread_message[user_id_str] = message_instance.id
            self.update_first_unread_message()

    def clear_user_to_read(self, user_id):
        #TODO: this should be done atomically
        user_id_str = str(user_id)
        if user_id_str in self.first_unread_message:
            del self.first_unread_message[user_id_str]
            self.update_first_unread_message()

    def user_posted(self, user, message_instance):
        if user.id != self.user1_id:
            self.mark_user_to_read(self.user1_id, message_instance)
        if user.id != self.user2_id:
            self.mark_user_to_read(self.user2_id, message_instance)

    def add_to_state(self, state, last_message_id=None, message_count=50, show_hidden=False):
        state.add(self)
        message_thread_summary = MessageThreadSummary(self.message_thread,
                                                      message_count=message_count,
                                                      last_id=last_message_id,
                                                      show_hidden=show_hidden,
                                                      include_online_info=False)
        message_thread_summary.add_to_state(state)


class GroupChat(StreamObjectMixin):
    title = models.CharField(max_length=512)
    message_thread = models.ForeignKey(MessageThread, on_delete=models.CASCADE, related_name="+")
    group = models.ForeignKey("accounts.UserGroup", on_delete=models.CASCADE, null=True, blank=True)
    max_message_size = models.IntegerField(default=4096)

    stream_name_pattern = re.compile(r"messagethread-groupchat-(\d+)-m=(\d+)")

    class Meta:
        db_table = "GroupChat"

    def __str__(self):
        return "GroupChat-" + str(self.id) + " " + self.title + " Group-" + str(self.group_id)

    def get_stream_name(self):
        return self.message_thread.stream_name

    def get_desired_stream_name(self):
        return "messagethread-groupchat-" + str(self.id) + "-m=" + str(self.message_thread_id)

    @classmethod
    def create(cls, title, group, messages_editable=True):
        message_thread = MessageThread(stream_name="invalid", messages_editable=messages_editable, metadata=dict())
        message_thread.save()
        group_chat = GroupChat(title=title, message_thread=message_thread, group=group)
        group_chat.save()
        message_thread.stream_name = group_chat.get_desired_stream_name()
        message_thread.save()
        return group_chat

    @classmethod
    def matches_stream_name(cls, stream_name):
        return cls.stream_name_pattern.match(stream_name) is not None

    @classmethod
    def can_subscribe(cls, user, stream_name):
        result, reason = cls.guest_can_subscribe(stream_name)
        if (user is None) or (result is True):
            return result, reason
        return False, "DAFUQ?!"

    @classmethod
    def guest_can_subscribe(cls, stream_name):
        return cls.matches_stream_name(stream_name), "It matches stream name so should be just fine!"

    def can_post(self, user, message):
        if user.chat_muted:
            return False, BaseError.NOT_ALLOWED
        if self.message_thread.muted:
            return False, BaseError.NOT_ALLOWED
        if len(message) > self.max_message_size:
            return False, ChatError.INVALID_MESSAGE_CONTENT

        if not self.group_id:
            return True, True

        return False, BaseError.NOT_ALLOWED

    def post_from_request(self, request):
        return self.message_thread.create_message_from_request(request)

    def post(self, user, message):
        return self.message_thread.create_message(user, content=message)

    def set_muted(self, muted):
        self.message_thread.set_muted(muted)

    def to_json(self):
        return {
            "id": self.id,
            "title": self.title,
            "messageThreadId": self.message_thread_id,
            "maxMessageSize": self.max_message_size,
        }

    def add_to_state(self, state, last_message_id=None, show_hidden=False):
        state.add(self)
        message_thread_summary = MessageThreadSummary(self.message_thread, last_id=last_message_id, show_hidden=show_hidden)
        message_thread_summary.add_to_state(state)


# TODO: rename to CommentableMixin
class Commentable(StreamObjectMixin):
    discussion = models.OneToOneField(GroupChat, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        abstract = True

    def get_discussion_name(self):
        return "Discussion for " + str(self)

    def get_discussion_last_activity(self):
        if not self.discussion:
            return datetime.fromtimestamp(0)
        return self.discussion.message_thread.last_activity

    def create_discussion(self, group=None):
        self.refresh_from_db()
        if self.discussion_id:
            return

        self.discussion = GroupChat.create(self.get_discussion_name(), group)
        self.save()

    def set_discussion_muted(self, muted):
        self.discussion.set_muted(muted)


class MessageThreadSummary(object):
    def __init__(self, message_thread, message_count=20, last_id=None, show_hidden=False, include_online_info=True,
                 include_messages_count=True):
        # TODO: include_online_info should default to False
        self.message_thread = message_thread
        self.messages = []

        self.include_messages_count = include_messages_count
        if include_messages_count:
            self.num_messages = self.message_thread.messages.filter(hidden=False).count()

        if message_count > 0:
            messages = self.message_thread.messages.order_by("-id")
            if last_id:
                messages = messages.filter(id__lt=last_id)
            if not show_hidden:
                messages = messages.filter(hidden=False)
            messages = messages[:message_count]
            self.messages = list(messages.prefetch_related("reaction_collection"))
            self.messages.reverse()

        self.include_online_info = include_online_info
        if include_online_info:
            self.meta = NodeWSMeta()
            self.online_user_ids = self.meta.get_online_users(message_thread.stream_name)

    @classmethod
    def object_type(cls):
        return "messagethread"

    @property
    def id(self):
        return self.message_thread.id

    def get_user_ids(self):
        user_id_set = set()
        for message in self.messages:
            user_id_set.add(message.user_id)
        return list(user_id_set)

    def add_to_state(self, state, including_users=True):
        state.add(self)
        for message in self.messages:
            message.add_to_state(state)

    def to_json(self):
        rez = self.message_thread.to_json()
        if self.include_online_info:
            rez["online"] = self.online_user_ids
        if self.include_messages_count:
            rez["numMessages"] = self.num_messages
        return rez


register_stream_handler(GroupChat)
