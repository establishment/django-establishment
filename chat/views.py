from typing import Any, Optional

from django.contrib.auth import get_user_model
from django.db.models import Q
from pydantic import Field

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.chat.errors import MessageLimitExceeded, NewPrivateChatLimitExceeded
from establishment.chat.models import MAX_VIRTUAL_ID_LENGTH, PrivateChat, GroupChat, MessageInstance
from establishment.utils.errors import NotFound, PermissionDenied
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.state import State
from establishment.webapp.throttle import UserActionThrottler
from establishment.webapp.view_set import WebappViewSet

chat_views = WebappViewSet()


class EditMessageRequest(BaseRequest):
    message_id: ObjectId[MessageInstance]
    message: Optional[str] = None
    hidden: bool = False
    delete: bool = False
    reaction: Optional[str] = None


@chat_views.post()
def edit_message(request: EditMessageRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    message_instance = request.message_id.obj
    message_thread = message_instance.message_thread
    is_author_or_admin = user.is_superuser or user.id == message_instance.user_id

    if request.message is not None:
        # TODO: should not be editing messages directly, good enough for now
        if not user.is_superuser:
            if not message_thread.messages_editable or not is_author_or_admin:
                raise PermissionDenied
            message_thread.check_can_post(user, request.message)

        message_instance.edit(user, request.message)

    if request.hidden:
        if not is_author_or_admin:
            raise PermissionDenied
        message_instance.hide_message()

    if request.delete:
        if not is_author_or_admin:
            raise PermissionDenied
        message_instance.delete_message()

    if request.reaction is not None:
        if request.reaction != "resetReaction":
            message_instance.set_reaction(user, request.reaction)
        else:
            message_instance.clear_reaction(user)

    return {}


class PrivateChatListRequest(BaseRequest):
    only_unread: bool = False


@chat_views.get()
def private_chat_list(request: PrivateChatListRequest, user: AbstractStreamObjectUser) -> State:
    # TODO: superuser shoud be able to specify a user
    private_chats = PrivateChat.objects.filter(Q(user1=user) | Q(user2=user))
    if request.only_unread:
        private_chats = private_chats.filter(first_unread_message__has_key=str(user.id))
    private_chats = private_chats.prefetch_related("message_thread")
    state = State()
    # TODO: it's very expensive to have num_private_chat DB hits for messages, optimize this
    for private_chat in private_chats:
        private_chat.add_to_state(state, message_count=20)
    return state


class PrivateChatStateRequest(BaseRequest):
    user_id: int
    last_message_id: Optional[int] = None


@chat_views.post()
def private_chat_state(request: PrivateChatStateRequest, user: AbstractStreamObjectUser) -> State:
    other_user = get_user_model().objects.filter(id=request.user_id).first()
    if other_user is None:
        raise NotFound

    state = State()

    existing_chat = PrivateChat.get(user1=other_user, user2=user)
    if existing_chat:
        existing_chat.add_to_state(state, message_count=20, last_message_id=request.last_message_id)
        return state.add_extra({"privateChatId": existing_chat.id})

    if not user.is_superuser and not UserActionThrottler(user, "create-private-chat", 24 * 60 * 60, 10).increm():
        raise NewPrivateChatLimitExceeded

    private_chat = PrivateChat.get_or_create(other_user, user)
    private_chat.add_to_state(state)

    return state.add_extra({"privateChatId": private_chat.id})


class PrivateChatPostRequest(BaseRequest):
    private_chat_id: ObjectId[PrivateChat]
    message: str
    virtual_id: Optional[str] = Field(None, max_length=MAX_VIRTUAL_ID_LENGTH)


@chat_views.post()
def private_chat_post(request: PrivateChatPostRequest, user: AbstractStreamObjectUser) -> State:
    if not user.is_superuser:
        # TODO: this needs multiple throttlers
        if not UserActionThrottler(user, "post-message", 60, 60).increm():
            raise MessageLimitExceeded

    private_chat = request.private_chat_id.obj

    private_chat.check_can_post(user, request.message)

    message_instance = private_chat.message_thread.create_message(user, request.message, virtual_id=request.virtual_id,
                                                                  stream_names=private_chat.get_user_streams())

    state = State()
    state.add(private_chat)
    state.add(private_chat.message_thread)
    state.add(message_instance)

    private_chat.user_posted(user, message_instance)

    private_chat.publish_event("privateMessage", {}, extra={
        "messageId": message_instance.id,
        "privateChatId": private_chat.id,
        "state": state
    }, stream_names=private_chat.get_user_streams())

    return State(message_instance).add_extra({"messageId": message_instance.id})


class PrivateChatMarkReadRequest(BaseRequest):
    private_chat_id: ObjectId[PrivateChat]


@chat_views.post()
def private_chat_mark_read(request: PrivateChatMarkReadRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    private_chat = request.private_chat_id.obj
    if user.id != private_chat.user1_id and user.id != private_chat.user2_id:
        # TODO: log this!
        raise PermissionDenied
    private_chat.clear_user_to_read(user.id)
    return {"success": True}


class GroupChatStateRequest(BaseRequest):
    chat_id: ObjectId[GroupChat]
    last_message_id: Optional[int] = None


@chat_views.get()
def group_chat_state(request: GroupChatStateRequest, user: Optional[AbstractStreamObjectUser]) -> State:
    group_chat = request.chat_id.obj
    state = State(user=user)
    group_chat.add_to_state(state, request.last_message_id)
    return state


class GroupChatPostRequest(BaseRequest):
    chat_id: ObjectId[GroupChat]
    message: str
    virtual_id: Optional[str] = Field(None, max_length=MAX_VIRTUAL_ID_LENGTH)


@chat_views.post()
def group_chat_post(request: GroupChatPostRequest, user: AbstractStreamObjectUser) -> State:
    if not user.is_superuser:
        if not UserActionThrottler(user, "post-message", 60, 100).increm():
            raise MessageLimitExceeded

    group_chat = request.chat_id.obj
    group_chat.check_can_post(user, request.message)

    message_instance = group_chat.message_thread.create_message(user, request.message, virtual_id=request.virtual_id)

    return State(message_instance).add_extra({"messageId": message_instance.id})
