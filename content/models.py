from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.db import transaction

from establishment.funnel.stream import StreamObjectMixin
from establishment.localization.models import Language


class EditableTextField(JSONField):
    """
    Class meant to keep historic versions of a string
    max_length=1<<16 - max length of valid string
    max_versions=32 - max_number of versions to keep
    drop_past_versions=True - should drop past versions if over the limit on edits
    """
    pass


class Tag(StreamObjectMixin):
    name = models.CharField(max_length=256, unique=True)
    parent = models.ForeignKey("Tag", on_delete=models.SET_NULL, related_name="children", null=True, blank=True)
    meta = JSONField(null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "Tag"


class TaggableMixin(models.Model):
    tags = models.ManyToManyField(Tag, blank=True)

    def add_tags_to_dict(self, d):
        if len(self.tags.all()) > 0:
            d["tagIds"] = [tag.id for tag in self.tags.all()]

    class Meta:
        abstract = True


class TermDefinition(StreamObjectMixin):
    term = models.CharField(max_length=256, unique=True)
    title = models.CharField(max_length=256, null=True)
    definition = models.TextField(max_length=8192)

    class Meta:
        db_table = "TermDefinition"

    def __str__(self):
        return "TermDefinition-" + str(self.id) + " " + self.term


class BaseArticleArticle(models.Model):
    version = models.IntegerField()
    markup = models.TextField(default="")

    class Meta:
        abstract = True


#TODO: ArticleEdit and Article should inherit from a base class with all shared fields
class ArticleEdit(StreamObjectMixin):
    article = models.ForeignKey("Article", on_delete=models.CASCADE)
    version = models.IntegerField()
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_modified = models.DateTimeField(auto_now_add=True)
    markup = models.TextField(default="")

    class Meta:
        db_table = "ArticleEdit"
        unique_together = ("article", "version")

    def init(self, article, author):
        self.article = article
        self.author = author
        self.version = article.version
        self.markup = article.markup

    def __str__(self):
        return "ArticleEdit-" + str(self.id) + " Article-" + self.article.name

    def to_json(self):
        return {
            "id": self.id,
            "articleId": self.article_id,
            "version": self.version,
            "dateModified": self.date_modified,
            "content": self.markup
        }


class Article(models.Model):
    is_public = models.BooleanField("Should be accessible by ID by everyone", default=False)
    version = models.IntegerField(default=0)
    author_created = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_created = models.DateTimeField(auto_now_add=True)
    date_modified = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=256)
    dependency = models.CharField("The javascript to import before rendering this article", max_length=512, default="", blank=True)
    markup = models.TextField(max_length=1<<18, default="")
    compiled_json = models.TextField(max_length=1<<18, default="{}", blank=True)
    compiled_html = models.TextField(max_length=1<<19, default="", blank=True)
    language = models.ForeignKey(Language, on_delete=models.CASCADE, default=1)
    base_article = models.ForeignKey("Article", on_delete=models.CASCADE, null=True, blank=True)

    class Meta:
        db_table = "Article"
        unique_together = ("base_article", "language")

    @classmethod
    def object_type(cls):
        return "article"

    def __str__(self):
        return "Article-" + str(self.id) + " " + self.name

    def edit(self, user, markup, compiled_json="", compiled_html=""):
        if markup == self.markup:
            # don't do anything
            return self.version
        with transaction.atomic():
            self.version += 1

            self.markup = markup
            self.compiled_json = compiled_json
            self.compiled_html = compiled_html

            article_edit = ArticleEdit()
            article_edit.init(article=self, author=user)

            article_edit.save()
            self.save()

            return self.version

    def is_available_to(self, user):
        if user.is_authenticated and self.author_created_id == user.id:
            return True
        return self.is_public or user.is_superuser

    @classmethod
    def get_editable_articles(cls, user):
        if user.is_superuser:
            articles = cls.objects.all()
        else:
            articles = cls.objects.filter(author_created_id=user.id)
        return articles

    def add_to_state(self, state, with_edits=False):
        state.add(self)
        if with_edits:
            article_edits = ArticleEdit.objects.filter(article=self)
            state.add_all(article_edits)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "userCreatedId": self.author_created_id,
            "dateCreated": self.date_created,
            "dateModified": self.date_modified,
            "version": self.version,
            "markup": self.markup,
            "dependency": self.dependency,
            "compiledJSON": self.compiled_json,
            "languageId": self.language_id,
            "baseArticleId": self.base_article_id,
            "isPublic": self.is_public
        }


class UserFeedback(StreamObjectMixin):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True)
    sender_email = models.EmailField()
    date = models.DateTimeField(auto_now_add=True)
    message = models.TextField(max_length=1 << 15)
    client_message = models.TextField(max_length=1 << 16, default="{}")

    class Meta:
        db_table = "UserFeedback"

    def __str__(self):
        return "UserFeedback-" + str(self.id)

    @classmethod
    def create_from_request(cls, request):
        user_feedback = super().create_from_request(request)
        if request.user.is_authenticated:
            user_feedback.sender_email = request.user.email
        return user_feedback

