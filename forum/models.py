import re

from django.conf import settings
from django.db import models
from django.db.models import F

from establishment.chat.models import MessageThread, MessageThreadSummary
from establishment.errors.errors import BaseError
from establishment.funnel.stream import StreamObjectMixin


# TODO: should it have read/edit permissions?
class Forum(StreamObjectMixin):
    name = models.CharField(max_length=256)
    parent = models.ForeignKey("Forum", related_name="sub_forums", null=True, blank=True)

    stream_name_pattern = re.compile(r"forum-(\d+)")

    class Meta:
        db_table = "Forum"
        unique_together = (("name", "parent"),)

    def __str__(self):
        return "Forum-" + str(self.id) + " " + self.name

    def get_stream_name(self):
        return "forum-" + str(self.id)

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

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "parentId": self.parent_id,
        }

    def add_to_state(self, state, request=None, include_hidden_threads=False):
        state.add(self)
        for sub_forum in self.sub_forums.all():
            state.add(sub_forum)
        forum_threads = self.forum_threads.all()
        if not include_hidden_threads:
            forum_threads = forum_threads.filter(hidden=False)
        for forum_thread in forum_threads:
            forum_thread.add_preview_state(state)


class ForumThread(StreamObjectMixin):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="+")
    title = models.CharField(max_length=160)
    content = models.OneToOneField("chat.MessageInstance", on_delete=models.PROTECT, related_name="+")
    parent = models.ForeignKey(Forum, on_delete=models.CASCADE, related_name="forum_threads")
    message_thread = models.OneToOneField(MessageThread, on_delete=models.PROTECT, related_name="forum_thread")
    num_views = models.IntegerField(default=0)
    time_added = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False)
    pinned_index = models.IntegerField(blank=True, null=True)

    stream_name_pattern = re.compile(r"messagethread-forumthread-(\d+)-m=(\d+)")

    class Meta:
        db_table = "ForumThread"
        unique_together = (("title", "parent"),)

    def __str__(self):
        return "ForumThread-" + str(self.id) + " " + self.title

    def increment_num_views(self):
        self.num_views = F("num_views") + 1
        self.save(update_fields=["num_views"])
        self.refresh_from_db(fields=["num_views"])
        self.publish_event("viewCount", {"numViews": self.num_views})

    def get_stream_name(self):
        return [self.message_thread.stream_name, self.parent.get_stream_name()]

    def get_desired_stream_name(self):
        return "messagethread-forumthread-" + str(self.id) + "-m=" + str(self.message_thread_id)

    @classmethod
    def create(cls, author, title, content, parent_forum):
        message_thread = MessageThread(stream_name="invalid", messages_editable=True, metadata=dict())
        message_thread.save()
        forum_thread = ForumThread(author=author,
                                   title=title,
                                   content=message_thread.create_message(user=author, content=content),
                                   parent=parent_forum,
                                   message_thread=message_thread)
        forum_thread.save()
        message_thread.stream_name = forum_thread.get_desired_stream_name()
        message_thread.save(update_fields=["stream_name"])
        return forum_thread

    @classmethod
    def matches_stream_name(cls, stream_name):
        return cls.stream_name_pattern.match(stream_name)

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
        return True, True

    def post_message_from_request(self, request):
        return self.message_thread.create_message_from_request(request)

    def post_message(self, user, message):
        return self.message_thread.create_message(user, content=message)

    def set_muted(self, muted):
        self.message_thread.set_muted(muted)

    def hide_thread(self):
        self.hidden = True
        self.save(update_fields=["hidden"])
        self.publish_delete_event()

    def get_last_active(self):
        return self.message_thread.last_activity

    def to_json(self):
        # last_active = self.message_thread.messages.order_by()
        result = {
            "id": self.id,
            "authorId": self.author_id,
            "title": self.title,
            "contentMessageId": self.content_id,
            "votesBalance": self.content.get_votes_balance(),
            "parentId": self.parent_id,
            "messageThreadId": self.message_thread_id,
            "numViews": self.num_views,
            "timeAdded": self.time_added,
            "lastActive": self.get_last_active(),
            "numMessages": self.message_thread.messages.filter(hidden=False).count(),
            "pinnedIndex": self.pinned_index,
        }

        if self.hidden:
            result["hidden"] = self.hidden

        return result

    def add_preview_state(self, state):
        state.add(self)
        state.add(self.content)
        state.add(self.message_thread)

    def add_to_state(self, state, request=None):
        state.add(self)
        state.add(self.content)
        message_thread_summary = MessageThreadSummary(self.message_thread, include_online_info=False, message_count=9999)
        message_thread_summary.add_to_state(state)
