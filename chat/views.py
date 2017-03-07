from django.contrib.auth import get_user_model
from django.db.models import Q

from establishment.chat.errors import ChatError
from establishment.chat.models import PrivateChat, GroupChat, MessageInstance
from establishment.errors.errors import BaseError
from establishment.funnel.base_views import login_required_ajax, JSONResponse, ajax_required, global_renderer
from establishment.funnel.throttle import UserActionThrottler
from establishment.funnel.utils import GlobalObjectCache


def global_chat(request):
    chat = GroupChat.objects.get(title="global-chat")
    state = GlobalObjectCache()
    chat.add_to_state(state)
    widget_options = {
        "chatId": chat.id
    }
    return global_renderer.render_ui_widget(request, "GroupChatWidget", state=state, widget_options=widget_options)


@login_required_ajax
def edit_message(request):
    message_id = int(request.POST["messageId"])
    message_instance = MessageInstance.objects.get(id=message_id)
    message_thread = message_instance.message_thread

    if "message" in request.POST:
        new_content = request.POST["message"]

        #TODO: should not be editing messages directly, good enough for now
        if not request.user.is_superuser:
            if not message_thread.messages_editable:
                return BaseError.NOT_ALLOWED
            if request.user.id != message_instance.user_id:
                return BaseError.NOT_ALLOWED
            # TODO: need a proper pattern here
            can_post, error = message_thread.can_post(request.user, new_content)
            if not can_post:
                return error

        message_instance.edit(request.user, new_content)

    # TODO: extract if true or false from json.loads(request.POST["hidden"])
    if "hidden" in request.POST:
        if not request.user.is_superuser and request.user.id != message_instance.user_id:
            return BaseError.NOT_ALLOWED
        message_instance.hide_message()

    if "delete" in request.POST:
        if not request.user.is_superuser and request.user.id != message_instance.user_id:
            return BaseError.NOT_ALLOWED
        message_instance.delete_message()

    if "reaction" in request.POST:
        reaction = request.POST["reaction"]
        if reaction != "resetReaction":
            message_instance.set_reaction(request.user, reaction)
        else:
            message_instance.clear_reaction(request.user)

    return JSONResponse({})


@login_required_ajax
def private_chat_list(request):
    # TODO: superuser shoud be able to specify a user
    private_chats = PrivateChat.objects.filter(Q(user1=request.user) | Q(user2=request.user))
    if "onlyUnread" in request.GET:
        private_chats = private_chats.filter(first_unread_message__has_key=str(request.user.id))
    private_chats = private_chats.prefetch_related("message_thread")
    state = GlobalObjectCache()
    # TODO: it's very expensive to have num_private_chat DB hits for messages, optimize this
    for private_chat in private_chats:
        private_chat.add_to_state(state, message_count=20)
    return JSONResponse({"state": state})


@login_required_ajax
def private_chat_state(request):
    user1 = get_user_model().objects.get(id=int(request.POST["userId"]))
    user2 = request.user

    state = GlobalObjectCache()

    existing_chat = PrivateChat.get(user1=user1, user2=user2)

    if existing_chat:
        existing_chat.add_to_state(state, message_count=20)
        return JSONResponse({"privateChatId": existing_chat.id, "state": state})

    create_throttle = UserActionThrottler(request.user, "create-private-chat", 24 * 60 * 60, 10)

    if not request.user.is_superuser and not create_throttle.increm():
        return ChatError.NEW_PRIVATE_CHAT_LIMIT_EXCEEDED

    private_chat = PrivateChat.get_or_create(user1, user2)
    private_chat.add_to_state(state)

    return JSONResponse({"privateChatId": private_chat.id, "state": state})


@login_required_ajax
def private_chat_post(request):
    if not request.user.is_superuser:
        # TODO: this needs multiple throttlers
        user_run_throttler = UserActionThrottler(request.user, "post-message", 60, 60)
        if not user_run_throttler.increm():
            return ChatError.MESSAGE_LIMIT_EXCEEDED

    private_chat_id = int(request.POST["privateChatId"])
    content = request.POST["message"]

    try:
        private_chat = PrivateChat.objects.get(id=private_chat_id)
    except Exception as e:
        # TODO: log this
        return BaseError.OBJECT_NOT_FOUND

    can_post, error = private_chat.can_post(request.user, content)
    if not can_post:
        # TODO: log this
        return error

    message_instance, json_response = private_chat.create_message_from_request(request)

    state = GlobalObjectCache()
    state.add(private_chat)
    state.add(private_chat.message_thread)
    state.add(message_instance)

    private_chat.user_posted(request.user, message_instance)

    private_chat.publish_event("privateMessage", {}, extra={
        "messageId": message_instance.id,
        "privateChatId": private_chat.id,
        "state": state
    }, stream_names=private_chat.get_user_streams())

    return json_response


@login_required_ajax
def private_chat_mark_read(request):
    private_chat = PrivateChat.objects.get(id=int(request.POST["privateChatId"]))
    if request.user.id != private_chat.user1_id and request.user.id != private_chat.user2_id:
        # TODO: log this!
        return BaseError.NOT_ALLOWED
    private_chat.clear_user_to_read(request.user.id)
    return JSONResponse({"success": True})


@ajax_required
def group_chat_state(request):
    group_chat = GroupChat.objects.get(id=int(request.GET["chatId"]))

    state = GlobalObjectCache(request)

    last_message_id = request.GET.get("lastMessageId", None)
    if last_message_id:
        last_message_id = int(last_message_id)

    group_chat.add_to_state(state, last_message_id)

    return state.to_response()


@login_required_ajax
def group_chat_post(request):
    if not request.user.is_superuser:
        user_run_throttler = UserActionThrottler(request.user, "post-message", 60, 100)
        if not user_run_throttler.increm():
            return ChatError.MESSAGE_LIMIT_EXCEEDED

    group_chat_id = int(request.POST["chatId"])
    content = request.POST["message"]

    group_chat = GroupChat.objects.get(id=group_chat_id)

    can_post, error = group_chat.can_post(request.user, content)

    if not can_post:
        return error

    message, json_response = group_chat.post_from_request(request)

    return json_response
