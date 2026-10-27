import time
from typing import Any, Optional

from django.core.mail import mail_admins
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.utils.errors import NotFound, PermissionDenied, ValidationError
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.http.view_arguments_loaders import URLArg
from establishment.utils.http.view_context import BaseViewContext
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin
from .errors import (
    ProtectedArticle,
    QuestionnaireNotAvailable,
    RequestedTooManyArticles,
    TooMuchFeedback,
    TranslationExists,
)
from .models import TermDefinition, ArticleEdit, UserFeedback, Article, Questionnaire, QuestionnaireQuestion, \
                    QuestionnaireInstance, QuestionnaireQuestionResponse, QuestionnaireQuestionOption

content_views = WebappViewSet()


class CreateArticleRequest(BaseRequest):
    is_public: bool
    name: Optional[str] = None
    dependency: str = ""
    language_id: int = 1
    user_created_id: Optional[int] = None
    base_article_id: Optional[int] = None
    markup: Optional[str] = None


@content_views.post(permissions=is_admin)
def create_article(request: CreateArticleRequest, user: AbstractStreamObjectUser) -> State:
    # TODO: check a limit here
    name = request.name if request.name is not None else "Untitled Article " + str(time.time())
    owner_id = request.user_created_id if request.user_created_id is not None else user.id

    article = Article(author_created_id=owner_id, name=name, dependency=request.dependency, language_id=request.language_id,
                      is_public=request.is_public)
    if request.base_article_id is not None:
        article.base_article_id = request.base_article_id
    try:
        article.save()
    except IntegrityError as e:
        # TODO: really @Rocky, 23505????
        if e.__cause__.pgcode == "23505":
            raise TranslationExists
        raise

    if request.markup is not None:
        article.edit(user, request.markup)

    return State(article).add_extra({"article": article})


class FetchArticleRequest(BaseRequest):
    ids: list[int] = []


@content_views.get()
def fetch_article(request: FetchArticleRequest, user: Optional[AbstractStreamObjectUser]) -> State:
    if len(request.ids) > 128:
        raise RequestedTooManyArticles

    state = State()
    for article in Article.objects.filter(id__in=request.ids):
        if article.is_available_to(user):
            state.add(article)
    return state


def get_editable_article(article_id: int | str, user: AbstractStreamObjectUser) -> Article:
    article = Article.objects.filter(id=article_id).first()
    if article is None:
        raise NotFound
    if not user.is_superuser and article.author_created_id != user.id:
        raise PermissionDenied
    return article


# TODO: should be renamed to get_article_translations
@content_views.get(url_path=r"^article/(?P<article_id>\d+)/get_translations/$")
def get_translations(article_id: URLArg, user: AbstractStreamObjectUser) -> State:
    article = get_editable_article(article_id, user)

    translations = Article.objects.filter(base_article_id=article.id)
    return State(translations, TermDefinition.objects.all())


def get_article_state(article: Article) -> State:
    article_edits = ArticleEdit.objects.filter(article=article)

    state = State()
    state.add(article)
    state.add(article_edits)

    # TODO: Language should be loaded in PublicState
    from establishment.content.models import Language
    state.add(Language.objects.all())
    return state


@content_views.single_page_app(url_path=r"^article/(?P<article_id>\d+)/edit/$")
def edit_article_page(article_id: URLArg, user: AbstractStreamObjectUser) -> State:
    article = get_editable_article(article_id, user)
    return get_article_state(article).add_extra({"articleId": article.id})


class EditArticleRequest(BaseRequest):
    article_id: int
    dependency: Optional[str] = None
    language_id: Optional[int] = None
    name: Optional[str] = None
    is_public: Optional[bool] = None
    markup: Optional[str] = None


@content_views.post()
def edit_article(request: EditArticleRequest, user: AbstractStreamObjectUser) -> State | dict[str, Any]:
    article = get_editable_article(request.article_id, user)

    # TODO: throttle the number of edits an article can have here
    # TODO: keep only a limited number of versions for the edits for non-admin users
    # TODO: article sizes should be limited

    if request.dependency is not None and request.dependency != article.dependency:
        # Right now regular users can't add js dependencies to an article
        if not user.is_superuser:
            raise PermissionDenied
        article.dependency = request.dependency
    if request.language_id is not None:
        article.language_id = request.language_id
    if request.name is not None:
        article.name = request.name
    if request.is_public is not None:
        article.is_public = request.is_public

    if request.markup is not None:
        # Saving the markup saves the article along with it
        with transaction.atomic():
            article.edit(user, request.markup)
        return get_article_state(article).add_extra({"articleId": article.id, "success": True})

    try:
        article.save()
    except IntegrityError as e:
        if e.__cause__.pgcode == "23505":
            raise TranslationExists
        raise
    return {"success": True}


class SetArticleOwnerRequest(BaseRequest):
    new_owner: int


# TODO: this logic should be merged into edit_article
@content_views.post(url_path=r"^article/(?P<article_id>\d+)/set_owner/$", permissions=is_admin)
def set_article_owner(request: SetArticleOwnerRequest, article_id: URLArg) -> State:
    article = Article.objects.filter(id=article_id).first()
    if article is None:
        raise NotFound

    article.author_created_id = request.new_owner
    article.save()

    return State(article)


@content_views.post(url_path=r"^article/(?P<article_id>\d+)/delete/$")
def delete_article(article_id: URLArg, user: AbstractStreamObjectUser) -> dict[str, Any]:
    article = get_editable_article(article_id, user)

    try:
        article.delete()
    except models.ProtectedError:
        raise ProtectedArticle

    return {"success": True}


class SendFeedbackRequest(BaseRequest):
    message: str
    client_message: str = "{}"
    # Asked only of visitors, a user is known already
    name: Optional[str] = None
    email: Optional[str] = None


@content_views.post()
def send_feedback(request: SendFeedbackRequest, user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> dict[str, Any]:
    if not view_context.raw_request.visitor.get_throttler("postFeedback", (24 * 60 * 60, 5)).increm():
        raise TooMuchFeedback

    user_feedback = UserFeedback(message=request.message, client_message=request.client_message)

    if user is not None:
        user_feedback.user = user
        name = user.get_full_name()
        user_feedback.sender_email = user.email
    else:
        if request.name is None or request.email is None:
            raise ValidationError("A name and an email are needed to send feedback without an account")
        name = request.name
        user_feedback.sender_email = request.email

    user_feedback.save()

    mail_admins(
        "Feedback from %s (%s)" % (name, user_feedback.sender_email),
        request.message,
    )

    return {"success": True, "feedbackId": user_feedback.id}


class QuestionnaireRequest(BaseRequest):
    questionnaire_id: ObjectId[Questionnaire]


@content_views.post()
def questionnaire_state(request: QuestionnaireRequest, user: AbstractStreamObjectUser) -> State:
    questionnaire = request.questionnaire_id.obj

    if not user.is_superuser and not questionnaire.visible and questionnaire.owner_id != user.id:
        raise QuestionnaireNotAvailable

    state = State()
    questionnaire.add_to_state(state, user)
    return state


@content_views.get()
def questionnaire_all_answers(request: QuestionnaireRequest, user: AbstractStreamObjectUser) -> State:
    questionnaire = request.questionnaire_id.obj

    if not user.is_superuser and questionnaire.owner_id != user.id:
        raise PermissionDenied

    state = State()
    questionnaire.add_to_state(state)

    answers = QuestionnaireInstance.objects.filter(questionnaire=questionnaire).prefetch_related("question_answers__choices")
    for answer in answers:
        answer.add_to_state(state)

    return state


def get_questionnaire_instance(questionnaire: Questionnaire, user: AbstractStreamObjectUser) -> QuestionnaireInstance:
    if not user.is_superuser and not questionnaire.visible:
        raise QuestionnaireNotAvailable

    instance = QuestionnaireInstance.objects.filter(user=user, questionnaire=questionnaire).first()
    if instance is None:
        raise NotFound
    return instance


class QuestionnaireAnswerRequest(QuestionnaireRequest):
    question_id: ObjectId[QuestionnaireQuestion]
    text: Optional[str] = None
    choice_ids: list[int] = []


@content_views.post()
def questionnaire_answer(request: QuestionnaireAnswerRequest, user: AbstractStreamObjectUser) -> State:
    instance = get_questionnaire_instance(request.questionnaire_id.obj, user)

    question = request.question_id.obj
    if question.questionnaire_id != instance.questionnaire_id:
        raise PermissionDenied

    question_response, created = QuestionnaireQuestionResponse.objects.get_or_create(instance=instance, question=question)

    question_response.text = request.text

    if question.type == 2:  # Single choice
        if len(request.choice_ids):
            question_choice = QuestionnaireQuestionOption.objects.filter(id=request.choice_ids[0]).first()
            if question_choice is None:
                raise NotFound
            if question_choice.question_id != question.id:
                raise PermissionDenied
            question_response.choices.set([question_choice])
        else:
            question_response.choices.set([])
    if question.type == 3:  # Multiple choice
        question_choices = QuestionnaireQuestionOption.objects.filter(id__in=request.choice_ids)
        if len(question_choices) != len(request.choice_ids):
            raise PermissionDenied
        for question_choice in question_choices:
            if question_choice.question_id != question.id:
                raise PermissionDenied
        question_response.choices.set(list(question_choices))
    question_response.save()
    return State(question_response)


@content_views.post()
def questionnaire_submit(request: QuestionnaireRequest, user: AbstractStreamObjectUser) -> State:
    instance = get_questionnaire_instance(request.questionnaire_id.obj, user)

    instance.date_submitted = timezone.now()
    instance.save()

    return State(instance)
