import json

from establishment.content.models import Article
from establishment.documentation.models import DocumentationEntry
from establishment.funnel.base_views import ajax_required, JSONResponse, superuser_required, global_renderer
from establishment.funnel.utils import GlobalObjectCache


@ajax_required
@superuser_required
def create_entry(request):
    if int(request.POST["articleId"]) != 0:
        article = Article.objects.get(id=int(request.POST["articleId"]))
    else:
        article = Article(author_created=request.user, name=request.POST["name"])
        article.save()
    entry = DocumentationEntry.objects.create(parent_id=int(request.POST["parentId"]),
                                              name=request.POST["name"],
                                              url_name=request.POST["urlName"],
                                              parent_index=int(request.POST["parentIndex"]),
                                              article=article)
    entry.save()
    state = GlobalObjectCache()
    state.add(entry)
    state.add(entry.article)
    return JSONResponse({"state": state})


@ajax_required
@superuser_required
def edit_entry(request):
    entry = DocumentationEntry.objects.get(id=request.POST["entryId"])

    if int(request.POST["articleId"]) != 0:
        article = Article.objects.get(id=int(request.POST["articleId"]))
    else:
        article = Article(author_created=request.user, name=request.POST["name"])
        article.save()

    entry.name = request.POST["name"]
    entry.url_name = request.POST["urlName"]
    entry.parent_index = int(request.POST["parentIndex"])
    entry.article = article
    entry.save()

    state = GlobalObjectCache()
    state.add(entry)
    state.add(entry.article)
    return JSONResponse({"state": state})

@ajax_required
@superuser_required
def change_parents(request):
    deltas = {}
    for entry_delta in json.loads(request.POST["modifiedEntries"]):
        deltas[entry_delta["entryId"]] = entry_delta
    entries = DocumentationEntry.objects.filter(id__in=deltas.keys()).all()
    for entry in entries:
        entry_delta = deltas[entry.id]
        if "parentId" in entry_delta:
            if entry_delta["parentId"] == -1:
                entry.delete()
                return JSONResponse({"success": True})
            entry.parent_id = entry_delta["parentId"]
        if "parentIndex" in entry_delta:
            entry.parent_index = entry_delta["parentIndex"]
        entry.save()
    return JSONResponse({"success": True})


@superuser_required
def edit_documentation(request):
    state = GlobalObjectCache()

    documentation_entries = DocumentationEntry.objects.all().prefetch_related("article")
    for entry in documentation_entries:
        state.add(entry)
        state.add(entry.article)

    widget_options = {
        "documentationEntryId": 1,
    }

    return global_renderer.render_ui_widget(request, "AdminDocumentationPanel", state=state, widget_options=widget_options)


def documentation(request):
    state = GlobalObjectCache()

    documentation_entries = DocumentationEntry.objects.all().prefetch_related("article")
    for entry in documentation_entries:
        state.add(entry)
        state.add(entry.article)

    widget_options = {
        "documentationEntryId": 1,
    }

    return global_renderer.render_ui_widget(request, "DocumentationPanel", state=state, widget_options=widget_options)
