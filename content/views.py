import json
import time

from django.core.mail import mail_admins
from django.db import IntegrityError, models, transaction
from django.utils import timezone

from establishment.errors.errors import BaseError
from establishment.webapp.base_views import login_required, login_required_ajax, ajax_required, \
    superuser_required, single_page_app
from establishment.webapp.state import State
from .errors import ContentError
from .models import TermDefinition, ArticleEdit, UserFeedback, Article, Questionnaire, QuestionnaireQuestion, \
                    QuestionnaireInstance, QuestionnaireQuestionResponse, QuestionnaireQuestionOption



@superuser_required
@single_page_app
def article_manager_view(request):
    articles = Article.get_editable_articles(request.user)
    return State.from_objects(articles)


@login_required_ajax
def create_article(request):
    # TODO: check a limit here
    if not request.user.is_superuser:
        return BaseError.NOT_ALLOWED

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
            return ContentError.TRANSLATION_EXISTS
        raise

    if "markup" in request.POST:
        article.edit(request.user, request.POST["markup"], )

    state = State.from_objects(article)

    return state.to_response({"article": article})


@ajax_required
def fetch_article(request):
    article_ids = request.GET.getlist("ids[]")
    article_ids = [int(x) for x in article_ids]
    if len(article_ids) > 128:
        return ContentError.REQUESTED_TOO_MANY_ARTICLES
    articles = Article.objects.filter(id__in=article_ids)

    state = State()

    for article in articles:
        if article.is_available_to(request.user):
            state.add(article)

    return state.to_response()


@login_required_ajax
def get_available_articles(request):
    articles = Article.get_editable_articles(request.user)
    return State.from_objects(articles)


# TODO: should be renamed to get_article_translations
@login_required_ajax
def get_translations(request, article_id):
    article = Article.objects.get(id=article_id)
    if not request.user.is_superuser and article.author_created_id != request.user.id:
        return BaseError.NOT_ALLOWED

    translations = Article.objects.filter(base_article_id=article.id)
    return State.from_objects(translations, TermDefinition.objects.all())


@login_required
def full_article(request):
    article = Article.objects.get(id=int(request.GET["articleId"]))

    # Permission checking to access all edits for this article
    if not request.user.is_superuser and article.author_created != request.user:
        return BaseError.NOT_ALLOWED

    state = State()

    article.add_to_state(state, True)

    return state


def check_article_change(request, article):
    need_save = False
    if "dependency" in request.POST:
        # Right now regular users can't add js dependencies to an article
        if not request.user.is_superuser:
            return BaseError.NOT_ALLOWED
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

    state = State()
    state.add(article)
    state.add_all(article_edits)

    # TODO: Language should be loaded in PublicState
    from establishment.content.models import Language
    state.add_all(Language.objects.all())
    return state


@login_required
@single_page_app
def edit_article(request, article_id):
    article = Article.objects.get(id=article_id)

    if not request.user.is_superuser and request.user.id != article.author_created_id:
        return BaseError.NOT_ALLOWED

    # TODO: throttle the number of edits an article can have here
    # TODO: keep only a limited number of versions for the edits for non-admin users
    # TODO: article sizes should be limited

    need_save = check_article_change(request, article)
    if need_save:
        try:
            article.save()
        except IntegrityError as e:
            if e.__cause__.pgcode == '23505':
                return ContentError.TRANSLATION_EXISTS
            raise
        return {"success": True}
    else:
        state = get_article_state(article)
        return state.to_response({"articleId": article.id, "success": True})


# TODO: this logic should be merged into edit_article
@ajax_required
@superuser_required
def set_article_owner(request, article_id):
    article = Article.objects.get(id=article_id)

    new_owner_id = int(request.POST["newOwner"])
    article.author_created_id = new_owner_id
    article.save()

    return State.from_objects(article)


@login_required_ajax
def delete_article(request, article_id):
    article = Article.objects.get(id=article_id)
    if not request.user.is_superuser and request.user.id != article.author_created_id:
        return BaseError.NOT_ALLOWED

    try:
        article.delete()
    except models.ProtectedError:
        return ContentError.PROTECTED_ARTICLE

    return {"success": True}


def send_feedback(request):
    if not request.visitor.get_throttler("postFeedback", (24 * 60 * 60, 5)).increm():
        return ContentError.TOO_MUCH_FEEDBACK

    message = request.POST["message"]
    client_message = request.POST.get("clientMessage", "{}")

    user_feedback = UserFeedback(message=message, client_message=client_message)

    if request.user.is_authenticated:
        user_feedback.user = request.user
        name = request.user.get_full_name()
        user_feedback.sender_email = request.user.email
    else:
        name = request.POST["name"]
        user_feedback.sender_email = request.POST["email"]

    user_feedback.save()

    mail_admins(
        "Feedback from %s (%s)" % (name, user_feedback.sender_email),
        message,
        user_feedback.sender_email
    )

    return {"success": True, "feedbackId": user_feedback.id}


@login_required_ajax
def questionnaire_state(request):
    questionnaire_id = int(request.POST["questionnaireId"])
    questionnaire = Questionnaire.objects.get(id=questionnaire_id)

    if not request.user.is_superuser and not questionnaire.visible and questionnaire.owner_id != request.user.id:
        return BaseError.NOT_ALLOWED

    state = State()
    questionnaire.add_to_state(state, request.user)
    return state


@login_required_ajax
def questionnaire_all_answers(request):
    questionnaire_id = int(request.GET["questionnaireId"])
    questionnaire = Questionnaire.objects.get(id=questionnaire_id)

    if not request.user.is_superuser and questionnaire.owner_id != request.user.id:
        return BaseError.NOT_ALLOWED

    state = State()
    questionnaire.add_to_state(state)

    answers = QuestionnaireInstance.objects.filter(questionnaire=questionnaire).prefetch_related("question_answers__choices")
    for answer in answers:
        answer.add_to_state(state)

    return state


@login_required_ajax
def questionnaire_answer(request):
    questionnaire_id = int(request.POST["questionnaireId"])

    questionnaire = Questionnaire.objects.get(id=questionnaire_id)
    if not request.user.is_superuser and not questionnaire.visible:
        return BaseError.NOT_ALLOWED

    question = QuestionnaireQuestion.objects.get(id=int(request.POST["questionId"]))
    if question.questionnaire_id != questionnaire.id:
        return BaseError.NOT_ALLOWED

    instance = QuestionnaireInstance.objects.get(user=request.user, questionnaire=questionnaire)
    # if instance.date_submitted:
    #     return BaseError.NOT_ALLOWED

    question_response, created = QuestionnaireQuestionResponse.objects.get_or_create(instance=instance, question=question)

    question_response.text = request.POST.get("text", None)

    if question.type == 2:  # Single choice
        choice_id = request.POST.getlist("choiceIds[]", [])
        print(choice_id)
        if len(choice_id):
            choice_id = choice_id[0]
            question_choice = QuestionnaireQuestionOption.objects.get(id=choice_id)
            if question_choice.question_id != question.id:
                return BaseError.NOT_ALLOWED
            question_response.choices.set([question_choice])
        else:
            question_response.choices.set([])
    if question.type == 3:  # Multiple choice
        choice_ids = request.POST.getlist("choiceIds[]", [])
        question_choices = QuestionnaireQuestionOption.objects.filter(id__in=choice_ids)
        if len(question_choices) != len(choice_ids):
            return BaseError.NOT_ALLOWED
        for question_choice in question_choices:
            if question_choice.question_id != question.id:
                return BaseError.NOT_ALLOWED
        question_response.choices.set(list(question_choices))
    question_response.save()
    return State.from_objects(question_response)


@login_required_ajax
def questionnaire_submit(request):
    questionnaire_id = int(request.POST["questionnaireId"])

    questionnaire = Questionnaire.objects.get(id=questionnaire_id)
    if not request.user.is_superuser and not questionnaire.visible:
        return BaseError.NOT_ALLOWED

    instance = QuestionnaireInstance.objects.get(user=request.user, questionnaire=questionnaire)
    # if instance.date_submitted:
    #     return BaseError.NOT_ALLOWED

    instance.date_submitted = timezone.now()
    instance.save()

    return State.from_objects(instance)
