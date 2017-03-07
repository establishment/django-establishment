import datetime
import json

from django.db import transaction
from django.utils.text import slugify

from establishment.content.models import Article
from establishment.blog.models import BlogEntry
from establishment.funnel.utils import GlobalObjectCache
from establishment.funnel.base_views import JSONResponse, ajax_required, superuser_required, global_renderer


def blog(request):
    blog_posts = BlogEntry.objects.all()

    if not request.user.is_superuser:
        blog_posts = blog_posts.filter(visible=True)

    state = GlobalObjectCache()

    for blog_post in blog_posts.prefetch_related("article"):
        state.add(blog_post)
        article = blog_post.article
        state.add(article)

    widget_options = {
        "style": {
            "background-color": "#f3f4f6",
            "min-height": "100vh",
        }
    }

    return global_renderer.render_ui_widget(request, "BlogPanel", state, widget_options=widget_options)


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
