import datetime
from typing import Any, Optional

from django.db import transaction
from django.utils.text import slugify

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.blog.models import BlogEntry
from establishment.content.models import Article
from establishment.utils.errors import NotFound, PermissionDenied
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin

BLOG_FETCH_CHUNK = 5

blog_views = WebappViewSet()
# Routed after blog_views: any other path under the blog is a page the app routes in the browser
blog_page_views = WebappViewSet()


class GetBlogPostRequest(BaseRequest):
    entry_url_name: str


@blog_views.get()
def get_blog_post(request: GetBlogPostRequest, user: Optional[AbstractStreamObjectUser]) -> State:
    blog_post = BlogEntry.objects.filter(url_name=request.entry_url_name).first()
    if blog_post is None:
        raise NotFound
    if not blog_post.visible and (user is None or not user.is_superuser):
        raise PermissionDenied
    return State(blog_post, blog_post.article)


class BlogRequest(BaseRequest):
    last_date: Optional[float] = None  # A unix timestamp, the entries loaded are the ones before it


@blog_page_views.single_page_app(url_path=r"^")
def blog(request: BlogRequest, user: Optional[AbstractStreamObjectUser]) -> State:
    blog_posts = BlogEntry.objects.order_by("-article__date_created").prefetch_related("article")

    if user is None or not user.is_superuser:
        blog_posts = blog_posts.filter(visible=True)

    if request.last_date is not None:
        last_date = datetime.datetime.fromtimestamp(request.last_date)
        blog_posts = blog_posts.filter(article__date_created__lt=last_date)

    # One more than a chunk, to tell whether any are left after it
    blog_posts = blog_posts[:(BLOG_FETCH_CHUNK + 1)]

    state = State()
    for blog_post in blog_posts[:BLOG_FETCH_CHUNK]:
        blog_post.add_to_state(state)

    return state.add_extra({"finishedLoading": len(blog_posts) <= BLOG_FETCH_CHUNK})


class AddEntryRequest(BaseRequest):
    title: Optional[str] = None
    url_name: Optional[str] = None
    is_visible: bool = False
    content: Optional[str] = None


@blog_views.post(permissions=is_admin)
def add_entry(request: AddEntryRequest, user: AbstractStreamObjectUser) -> State:
    title = request.title if request.title is not None else "Unnamed entry" + str(datetime.datetime.now())
    url_name = request.url_name if request.url_name is not None else slugify(title)

    article = Article(author_created=user, name=title)

    if request.content is not None:
        article.markup = request.content

    with transaction.atomic():
        article.save()
        entry = BlogEntry.objects.create(url_name=url_name, article=article, visible=request.is_visible)

    state = State()
    entry.add_to_state(state)
    return state.add_extra({"blogEntryId": entry.id})


class ChangeEntrySettingsRequest(BaseRequest):
    entry_id: ObjectId[BlogEntry]
    is_visible: bool = False
    title: Optional[str] = None
    url_name: Optional[str] = None


@blog_views.post(permissions=is_admin)
def change_entry_settings(request: ChangeEntrySettingsRequest) -> dict[str, Any]:
    response: dict[str, Any] = {}

    entry = request.entry_id.obj
    article = entry.article

    if request.title is not None:
        # TODO: use an article.set_name() method
        article.name = request.title
        article.save()

    if request.url_name is not None:
        entry.url_name = request.url_name
        response["urlName"] = request.url_name

    entry.visible = request.is_visible
    entry.save()

    return response


class CreateEntryDiscussionRequest(BaseRequest):
    entry_id: ObjectId[BlogEntry]


@blog_views.post(permissions=is_admin)
def create_entry_discussion(request: CreateEntryDiscussionRequest) -> State:
    entry = request.entry_id.obj
    entry.create_discussion()
    entry.save()
    return State(entry)


def latest_blog_state():
    blog_entries = BlogEntry.objects.filter(visible=True, discussion__isnull=False)\
                                    .order_by("-discussion__message_thread__last_activity")\
                                    .prefetch_related("article", "discussion", "discussion__message_thread")[:5]

    state = State()
    for blog_entry in blog_entries:
        blog_entry.add_to_state(state)
    return state
