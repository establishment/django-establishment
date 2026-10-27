from typing import Any, Optional

from pydantic import Field

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.chat.models import MAX_VIRTUAL_ID_LENGTH
from establishment.chat.errors import MessageLimitExceeded
from establishment.forum.errors import ForumThreadLimitExceeded, InvalidTitle, TitleTooLong
from establishment.forum.models import ForumThread, Forum
from establishment.utils.errors import PermissionDenied
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.http.view_context import BaseViewContext
from establishment.utils.state import State
from establishment.webapp.throttle import UserActionThrottler, ActionThrottler
from establishment.webapp.view_set import WebappViewSet

forum_views = WebappViewSet()
# Routed after forum_views: any other path under the forum is a page the app routes in the browser
forum_page_views = WebappViewSet()


@forum_page_views.single_page_app(url_path=r"^")
def main_forum_view(user: Optional[AbstractStreamObjectUser]) -> State:
    main_forum = Forum.objects.get(id=1)
    state = State(user=user)
    main_forum.add_to_state(state)
    return state.add_extra({"forumId": main_forum.id})


class CreateForumThreadRequest(BaseRequest):
    forum_id: ObjectId[Forum]
    title: str
    message: str


@forum_views.post()
def create_forum_thread(request: CreateForumThreadRequest, user: AbstractStreamObjectUser) -> State:
    if not user.is_superuser:
        if not UserActionThrottler(user, "forum-thread-create", 24 * 60 * 60, 10).increm():
            raise ForumThreadLimitExceeded

    if len(request.title) > 160:
        raise TitleTooLong

    if not any(character.isalnum() for character in request.title):
        raise InvalidTitle

    forum_thread = ForumThread.create(user, request.title, request.message, request.forum_id.obj)

    state = State()
    forum_thread.publish_create_event()
    forum_thread.add_to_state(state)
    return state.add_extra({"forumThreadId": forum_thread.id})


class EditForumThreadRequest(BaseRequest):
    forum_thread_id: ObjectId[ForumThread]
    hidden: bool = False


@forum_views.post()
def edit_forum_thread(request: EditForumThreadRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    forum_thread = request.forum_thread_id.obj

    if request.hidden:
        if not user.is_superuser and user.id != forum_thread.author_id:
            raise PermissionDenied
        forum_thread.hide_thread()

    return {"success": True}


class ForumThreadPostRequest(BaseRequest):
    forum_thread_id: ObjectId[ForumThread]
    message: str
    virtual_id: Optional[str] = Field(None, max_length=MAX_VIRTUAL_ID_LENGTH)


@forum_views.post()
def forum_thread_post(request: ForumThreadPostRequest, user: AbstractStreamObjectUser) -> State:
    if not user.is_superuser:
        if not UserActionThrottler(user, "forum-post-message", 60, 5).increm():
            raise MessageLimitExceeded

    forum_thread = request.forum_thread_id.obj

    can_post, error = forum_thread.can_post(user, request.message)
    if not can_post:
        raise error

    message_instance = forum_thread.message_thread.create_message(user, request.message, virtual_id=request.virtual_id)

    forum_thread.publish_event("lastActive", {
        "lastActive": message_instance.time_added,
    })

    return State(message_instance).add_extra({"messageId": message_instance.id})


class ForumThreadStateRequest(BaseRequest):
    forum_thread_id: ObjectId[ForumThread]


@forum_views.post()
def forum_thread_state(request: ForumThreadStateRequest, user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> State:
    forum_thread = request.forum_thread_id.obj
    if forum_thread.hidden and (user is None or not user.is_superuser):
        raise PermissionDenied

    # A view counts once a day for each visitor
    forum_view_throttler = ActionThrottler(view_context.raw_request.visitor.unique() + "-forum-thread-" + str(forum_thread.id) + "-view", 60 * 60 * 24, 1)
    if forum_view_throttler.increm():
        forum_thread.increment_num_views()

    state = State(user=user)
    forum_thread.add_to_state(state)
    return state


def latest_forum_state():
    state = State()

    forum_threads = ForumThread.objects.filter(hidden=False)\
                                       .order_by("-message_thread__last_activity")\
                                       .prefetch_related("message_thread", "parent", "content", "content__reaction_collection")[:5]

    for forum_thread in forum_threads:
        state.add(forum_thread)
        state.add(forum_thread.parent)

    return state
