import datetime
import json
import logging

from django.db import transaction
from django.utils.text import slugify

from establishment.content.models import Article
from establishment.blog.models import BlogEntry
from establishment.funnel.utils import GlobalObjectCache
from establishment.funnel.base_views import JSONResponse, ajax_required, superuser_required, global_renderer, single_page_app


def get_blog_state(request):
    blog_posts = BlogEntry.objects.order_by("-article__date_created").prefetch_related("article")

    if not request.user.is_superuser:
        blog_posts = blog_posts.filter(visible=True)

    if request.is_ajax() and ("lastDate" in request.GET):
        blog_posts = blog_posts.filter(
            article__date_created__lt=datetime.datetime.fromtimestamp(float(request.GET["lastDate"])))[:4]
        count = 3
    else:
        blog_posts = blog_posts[:6]
        count = 5

    state = GlobalObjectCache()

    for blog_post in blog_posts[:count]:
        state.add(blog_post)
        article = blog_post.article
        state.add(article)
    return state, (len(blog_posts) != count + 1)


def blog(request):
    state, finished_loading = get_blog_state(request)

    if request.is_ajax() and ("lastDate" in request.GET):
        return JSONResponse({"state": state, "finishedLoading": finished_loading})

    widget_options = {
        "style": {
            "background-color": "#f3f4f6",
            "min-height": "100vh",
        },
        "finishedLoading": finished_loading
    }

    return global_renderer.render_ui_widget(request, "BlogPanel", state, widget_options=widget_options)


def get_blogpost(request):
    blog_post = None
    try:
        blog_post = BlogEntry.objects.get(url_name=str(request.GET["entryUrlName"]))
    except Exception as e:
        pass
    if blog_post and not blog_post.visible and not request.user.is_superuser:
        blog_post = None
    state = GlobalObjectCache()
    if blog_post:
        state.add(blog_post)
        state.add(blog_post.article)
    return JSONResponse({"state": state})


def latest_blog_state(request):
    state = GlobalObjectCache()

    blog_entries = BlogEntry.objects.filter(visible=True, discussion__isnull=False).prefetch_related("article", "discussion").distinct()
    blog_entries = list(blog_entries)
    blog_entries.sort(key=lambda entry: entry.get_last_active(), reverse=True)
    blog_entries = blog_entries[:5]

    for blog_entry in blog_entries:
        blog_entry.add_to_state(state)

    return JSONResponse({"state": state})


@single_page_app
def blog_single_page(request):
    state, finished_loading = get_blog_state(request)
    return JSONResponse({"state": state, "finishedLoading": finished_loading})


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

    state = GlobalObjectCache()
    entry.add_to_state(state)
    return JSONResponse({"state": state,
                         "blogEntryId": entry.id})


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

    return JSONResponse(response)


@ajax_required
@superuser_required
def create_entry_discussion(request):
    entry_id = int(request.POST["entryId"])
    entry = BlogEntry.objects.get(id=entry_id)
    entry.create_discussion()
    entry.save()

    state = GlobalObjectCache()
    state.add(entry)

    return state.to_response()
