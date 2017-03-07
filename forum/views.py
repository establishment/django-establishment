from establishment.errors.errors import BaseError
from establishment.forum.errors import ForumError
from establishment.forum.models import ForumThread, Forum
from establishment.funnel.base_views import ajax_required, JSONResponse, login_required_ajax, global_renderer
from establishment.funnel.utils import GlobalObjectCache
from establishment.funnel.throttle import UserActionThrottler, ActionThrottler


def main_forum_view(request):
    main_forum = Forum.objects.get(id=1)
    state = GlobalObjectCache()
    main_forum.add_to_state(state)
    return global_renderer.render_ui_widget(request, "ForumWidget", state=state, widget_options={"forumId": main_forum.id})


@login_required_ajax
def create_forum_thread(request):
    if not request.user.is_superuser:
        user_run_throttler = UserActionThrottler(request.user, "forum-thread-create", 24 * 60 * 60, 10)
        if not user_run_throttler.increm():
            return ForumError.FORUM_THREAD_LIMIT_EXCEEDED

    title = request.POST["title"]

    if len(title) > 160:
        return ForumError.TITLE_TOO_LONG

    non_empty_url = False
    for character in title:
        if character.isalnum():
            non_empty_url = True
    if not non_empty_url:
        return ForumError.INVALID_TITLE

    forum = Forum.objects.get(id=int(request.POST["forumId"]))
    forum_thread = ForumThread.create(request.user, request.POST["title"], request.POST["message"], forum)

    state = GlobalObjectCache()
    forum_thread.publish_create_event()
    forum_thread.add_to_state(state)
    return JSONResponse({
        "forumThreadId": forum_thread.id,
        "state": state
    })


@login_required_ajax
def edit_forum_thread(request):
    forum_thread = ForumThread.objects.get(id=int(request.POST["forumThreadId"]))

    # TODO: extract if true or false from json.loads(request.POST["hidden"])
    if "hidden" in request.POST:
        if not request.user.is_superuser and request.user.id != forum_thread.author_id:
            return BaseError.NOT_ALLOWED
        forum_thread.hide_thread()

    return JSONResponse({"success": True})


@login_required_ajax
def forum_thread_post(request):
    if not request.user.is_superuser:
        user_run_throttler = UserActionThrottler(request.user, "forum-post-message", 60, 5)
        if not user_run_throttler.increm():
            return ForumError.MESSAGE_LIMIT_EXCEEDED

    forum_thread = ForumThread.objects.get(id=int(request.POST["forumThreadId"]))
    content = request.POST["message"]

    can_post, error = forum_thread.can_post(request.user, content)
    if not can_post:
        return error

    message, json_response = forum_thread.post_message_from_request(request)

    if message:
        forum_thread.publish_event("lastActive", {
            "lastActive": message.time_added,
        })

    return json_response


@ajax_required
def forum_state(request):
    forum = Forum.objects.get(id=int(request.POST["forumId"]))
    state = GlobalObjectCache()
    forum.add_to_state(state)
    return state.to_response()


@ajax_required
def forum_thread_state(request):
    forum_thread = ForumThread.objects.get(id=int(request.POST["forumThreadId"]))
    if forum_thread.hidden and not request.user.is_superuser:
        return BaseError.NOT_ALLOWED

    forum_view_throttler = ActionThrottler(request.visitor.unique() + "-forum-thread-" + str(forum_thread.id) + "-view", 60 * 60 * 24, 1)
    if forum_view_throttler.increm():
        forum_thread.increment_num_views()

    state = GlobalObjectCache()
    forum_thread.add_to_state(state, request)
    return state.to_response()
