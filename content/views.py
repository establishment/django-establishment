import json
import time

from django.db import IntegrityError
from django.db import models
from django.db import transaction
from django.http import HttpResponseForbidden

from establishment.blog.models import BlogEntry
from establishment.content.models import TermDefinition, ArticleEdit, UserFeedback, Article
from establishment.funnel.utils import GlobalObjectCache
from establishment.funnel.base_views import JSONResponse, JSONErrorResponse, login_required, login_required_ajax, \
    ajax_required, superuser_required, global_renderer, single_page_app


@superuser_required
@login_required
def article_manager_view(request):
    from establishment.content.models import Language
    state = GlobalObjectCache()
    articles = Article.get_editable_articles(request.user)
    state.add_all(articles)
    # TODO: Language should be loaded in PublicState
    state.add_all(Language.objects.all())
    return global_renderer.render_ui_widget(request, "ArticleManager", state, page_title="Article Manager")


@superuser_required
@single_page_app
def article_manager_single_page_view(request):
    from establishment.content.models import Language
    state = GlobalObjectCache()
    articles = Article.get_editable_articles(request.user)
    state.add_all(articles)
    # TODO: Language should be loaded in PublicState
    state.add_all(Language.objects.all())
    return JSONResponse({"state": state})


@login_required_ajax
def create_article(request):
    # TODO: check a limit here
    if not request.user.is_superuser:
        return HttpResponseForbidden()

    name = request.POST.get("name", "Untitled Article " + str(time.time()))
    dependency = request.POST.get("dependency", "")
    language_id = request.POST.get("languageId", 1)
    is_public = json.loads(request.POST["isPublic"])
    owner_id = request.user.id
    if "userCreatedId" in request.POST:
        owner_id = int(request.POST["userCreatedId"])

    article = Article(author_created_id=owner_id, name=name, dependency=dependency, language_id=language_id,
                      is_public=is_public)
    if "baseArticleId" in request.POST:
        article.base_article_id = int(request.POST["baseArticleId"])
    try:
        article.save()
    except IntegrityError as e:
        # TODO: really @Rocky, 23505????
        if e.__cause__.pgcode == '23505':
            return JSONErrorResponse("A translation in this language already exists.")
        raise

    if "markup" in request.POST:
        article.edit(request.user, request.POST["markup"], )

    state = GlobalObjectCache()
    state.add(article)

    return JSONResponse({"state": state, "article": article})


@ajax_required
def fetch_article(request):
    article_ids = request.GET.getlist("ids[]")
    article_ids = [int(x) for x in article_ids]
    if len(article_ids) > 128:
        return JSONErrorResponse("Too many articles")
    articles = Article.objects.filter(id__in=article_ids)

    state = GlobalObjectCache()

    for article in articles:
        if article.is_available_to(request.user):
            state.add(article)

    return state.to_response()


@login_required_ajax
def get_available_articles(request):
    articles = Article.get_editable_articles(request.user)
    state = GlobalObjectCache()
    state.add_all(articles)

    return JSONResponse({"state": state})


# TODO: should be renamed to get_article_translations
@login_required_ajax
def get_translations(request, article_id):
    article = Article.objects.get(id=article_id)
    if not request.user.is_superuser and article.author_created_id != request.user.id:
        return HttpResponseForbidden()

    translations = Article.objects.filter(base_article_id=article.id)

    state = GlobalObjectCache()
    state.add_all(translations)
    state.add_all(TermDefinition.objects.all())

    return JSONResponse({"state": state})


@login_required
def full_article(request):
    article = Article.objects.get(id=int(request.GET["articleId"]))

    # Permission checking to access all edits for this article
    if not request.user.is_superuser and article.author_created != request.user:
        return HttpResponseForbidden()

    state = GlobalObjectCache()

    article.add_to_state(state, True)

    return JSONResponse({"state": state})


def check_article_change(request, article):
    need_save = False
    if "dependency" in request.POST:
        # Right now regular users can't add js dependencies to an article
        if not request.user.is_superuser:
            return HttpResponseForbidden()
        article.dependency = request.POST["dependency"]
        need_save = True
    if "languageId" in request.POST:
        article.language_id = int(request.POST["languageId"])
        need_save = True
    if "name" in request.POST:
        article.name = request.POST["name"]
        need_save = True
    if "isPublic" in request.POST:
        article.is_public = json.loads(request.POST["isPublic"])
        need_save = True
    if "markup" in request.POST:
        with transaction.atomic():
            article.edit(request.user, request.POST["markup"], )
            need_save = False
    return need_save


def get_article_state(article):
    article_edits = ArticleEdit.objects.filter(article=article)

    state = GlobalObjectCache()
    state.add(article)
    state.add_all(article_edits)

    # TODO: Language should be loaded in PublicState
    from establishment.content.models import Language
    state.add_all(Language.objects.all())
    return state


@login_required
def edit_article(request, article_id):
    article = Article.objects.get(id=article_id)

    if not request.user.is_superuser and request.user.id != article.author_created_id:
        return HttpResponseForbidden()

    # TODO: throttle the number of edits an article can have here
    # TODO: keep only a limited number of versions for the edits for non-admin users
    # TODO: article sizes should be limited

    if request.is_ajax():
        # TODO: atomic transaction
        need_save = check_article_change(request, article)

        if need_save:
            try:
                article.save()
            except IntegrityError as e:
                if e.__cause__.pgcode == '23505':
                    return JSONErrorResponse("A translation in this language already exists.")
                raise

        return JSONResponse({"success": True})

    state = get_article_state(article)
    # return render(request, "content/article_edit.html", context)
    return global_renderer.render_ui_widget(request, "ArticleEditor", state,
                                            page_title="Editing" + article.name,
                                            widget_options={"articleId": article.id})


@login_required
@single_page_app
def edit_article_single_page(request, article_id):
    article = Article.objects.get(id=article_id)

    if not request.user.is_superuser and request.user.id != article.author_created_id:
        return HttpResponseForbidden()

    need_save = check_article_change(request, article)
    if need_save:
        try:
            article.save()
        except IntegrityError as e:
            if e.__cause__.pgcode == '23505':
                return JSONErrorResponse("A translation in this language already exists.")
            raise
        return JSONResponse({"success": True})
    else:
        state = get_article_state(article)
        return JSONResponse({"state": state, "articleId": article.id, "success": True})


# TODO: this logic should be merged into edit_article
@ajax_required
@superuser_required
def set_article_owner(request, article_id):
    article = Article.objects.get(id=article_id)

    new_owner_id = int(request.POST["newOwner"])
    article.author_created_id = new_owner_id
    article.save()

    state = GlobalObjectCache()
    state.add(article)

    return JSONResponse({"state": state})


@login_required_ajax
def delete_article(request, article_id):
    article = Article.objects.get(id=article_id)

    if not request.user.is_superuser and request.user.id != article.author_created_id:
        return HttpResponseForbidden()

    # TODO: the article should not reference all of these here
    # Maybe we want a system_owned flag inside the article?
    if BlogEntry.objects.filter(article_id=article_id).exists():
        return JSONErrorResponse("The article is associated to a blog entry.")

    try:
        article.delete()
    except models.ProtectedError:
        return JSONErrorResponse("The article is protected.")

    return JSONResponse({"success": True})


def send_feedback(request):
    if request.visitor.get_throttler("postFeedback", (24 * 60 * 60, 5)).increm():
        return JSONErrorResponse("Too many posts, ignoring")

    # user_feedback = UserFeedback.create_from_request(request)
    # user_feedback.save()

    message = request.POST["message"]
    client_message = request.POST.get("clientMessage", "{}")

    user_feedback = UserFeedback(message=message, client_message=client_message)
    if request.user.is_authenticated:
        user_feedback.user = request.user
        user_feedback.sender_email = request.user.email
    else:
        user_feedback.sender_email = request.POST["email"]

    user_feedback.save()

    return JSONResponse({"success": True, "feedbackId": user_feedback.id})
