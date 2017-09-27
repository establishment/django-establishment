import datetime
import json

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.utils.text import slugify

from establishment.blog.models import BlogEntry
from establishment.content.models import Article
from establishment.errors.errors import BaseError
from establishment.webapp.base_views import ajax_required, superuser_required, single_page_app
from establishment.webapp.state import State

BLOG_FETCH_CHUNK = 5


def get_blog_state(request):
    blog_posts = BlogEntry.objects.order_by("-article__date_created").prefetch_related("article")

    if not request.user.is_superuser:
        blog_posts = blog_posts.filter(visible=True)

    if request.is_ajax() and "lastDate" in request.GET:
        last_date = datetime.datetime.fromtimestamp(float(request.GET["lastDate"]))
        blog_posts = blog_posts.filter(article__date_created__lt=last_date)

    blog_posts = blog_posts[:(BLOG_FETCH_CHUNK + 1)]

    state = State()

    for blog_post in blog_posts[:BLOG_FETCH_CHUNK]:
        blog_post.add_to_state(state)

    return state, (len(blog_posts) <= BLOG_FETCH_CHUNK)


def get_blogpost(request):
    try:
        blog_post = BlogEntry.objects.get(url_name=str(request.GET["entryUrlName"]))
        if not blog_post.visible and not request.user.is_superuser:
            return BaseError.NOT_ALLOWED
    except ObjectDoesNotExist:
        return BaseError.OBJECT_NOT_FOUND
    state = State()
    state.add(blog_post)
    state.add(blog_post.article)
    return state


@single_page_app
def blog(request):
    state, finished_loading = get_blog_state(request)
    return state.to_response({"finishedLoading": finished_loading})


@ajax_required
@superuser_required
def add_entry(request):
    title = request.POST.get("title", "Unnamed entry" + str(datetime.datetime.now()))
    url_name = request.POST.get("urlName", slugify(title))
    is_visible = json.loads(request.POST.get("isVisible", "false"))

    article = Article(author_created=request.user, name=title)

    if "content" in request.POST:
        article.markup = request.POST["content"]

    with transaction.atomic():
        article.save()
        entry = BlogEntry.objects.create(url_name=url_name, article=article, visible=is_visible)

    state = State()
    entry.add_to_state(state)
    return state.to_response({"blogEntryId": entry.id})


@ajax_required
@superuser_required
def change_entry_settings(request):
    response = {}

    entry_id = int(request.POST.get("entryId"))

    entry = BlogEntry.objects.get(id=entry_id)
    article = entry.article

    if "title" in request.POST:
        # TODO: use an article.set_name() method
        article.name = request.POST["title"]
        article.save()

    if "urlName" in request.POST:
        url_name = request.POST["urlName"]
        entry.url_name = url_name
        response["urlName"] = url_name

    is_visible = json.loads(request.POST.get("isVisible", "false"))
    entry.visible = is_visible
    entry.save()

    return response


@ajax_required
@superuser_required
def create_entry_discussion(request):
    entry_id = int(request.POST["entryId"])
    entry = BlogEntry.objects.get(id=entry_id)
    entry.create_discussion()
    entry.save()
    return State.from_objects(entry)


def latest_blog_state():
    blog_entries = BlogEntry.objects.filter(visible=True, discussion__isnull=False)\
                                    .order_by("-discussion__message_thread__last_activity")\
                                    .prefetch_related("article", "discussion", "discussion__message_thread")[:5]

    state = State()
    for blog_entry in blog_entries:
        blog_entry.add_to_state(state)
    return state
