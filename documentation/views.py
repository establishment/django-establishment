from typing import Any, Optional

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.content.models import Article
from establishment.documentation.models import DocumentationEntry
from establishment.utils.errors import NotFound
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin

documentation_views = WebappViewSet()
# Routed after documentation_views: any other path under the docs is a page the app routes in the browser
documentation_page_views = WebappViewSet()


class EntryRequest(BaseRequest):
    name: str
    url_name: str
    parent_index: int
    article_id: int  # 0 makes a new article for the entry


def get_entry_article(request: EntryRequest, user: AbstractStreamObjectUser) -> Article:
    if request.article_id == 0:
        article = Article(author_created=user, name=request.name)
        article.save()
        return article

    article = Article.objects.filter(id=request.article_id).first()
    if article is None:
        raise NotFound
    return article


class CreateEntryRequest(EntryRequest):
    parent_id: int


@documentation_views.post(url_path="create", permissions=is_admin)
def create_entry(request: CreateEntryRequest, user: AbstractStreamObjectUser) -> State:
    article = get_entry_article(request, user)
    entry = DocumentationEntry.objects.create(parent_id=request.parent_id,
                                              name=request.name,
                                              url_name=request.url_name,
                                              parent_index=request.parent_index,
                                              article=article)
    entry.save()
    return State(entry, entry.article)


class EditEntryRequest(EntryRequest):
    entry_id: ObjectId[DocumentationEntry]


@documentation_views.post(permissions=is_admin)
def edit_entry(request: EditEntryRequest, user: AbstractStreamObjectUser) -> State:
    entry = request.entry_id.obj
    entry.name = request.name
    entry.url_name = request.url_name
    entry.parent_index = request.parent_index
    entry.article = get_entry_article(request, user)
    entry.save()
    return State(entry, entry.article)


class EntryDelta(BaseRequest):
    entry_id: int
    parent_id: Optional[int] = None  # -1 deletes the entry
    parent_index: Optional[int] = None


class ChangeParentsRequest(BaseRequest):
    modified_entries: list[EntryDelta]


@documentation_views.post(permissions=is_admin)
def change_parents(request: ChangeParentsRequest) -> dict[str, Any]:
    deltas = {entry_delta.entry_id: entry_delta for entry_delta in request.modified_entries}
    entries = DocumentationEntry.objects.filter(id__in=deltas.keys()).all()
    for entry in entries:
        entry_delta = deltas[entry.id]
        if entry_delta.parent_id is not None:
            if entry_delta.parent_id == -1:
                entry.delete()
                return {"success": True}
            entry.parent_id = entry_delta.parent_id
        if entry_delta.parent_index is not None:
            entry.parent_index = entry_delta.parent_index
        entry.save()
    return {"success": True}


def get_documentation_state() -> State:
    state = State()

    documentation_entries = DocumentationEntry.objects.all().prefetch_related("article")
    for entry in documentation_entries:
        state.add(entry)
        state.add(entry.article)

    return state.add_extra({"documentationEntryId": 1})


@documentation_views.single_page_app(url_path=r"^edit/", permissions=is_admin)
def edit_documentation() -> State:
    return get_documentation_state()


@documentation_page_views.single_page_app(url_path=r"^")
def documentation() -> State:
    return get_documentation_state()
