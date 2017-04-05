from django.db import models

from establishment.content.models import Article
from establishment.chat.models import Commentable


class BlogEntry(Commentable):
    url_name = models.CharField(max_length=256, unique=True)
    article = models.OneToOneField(Article, on_delete=models.PROTECT, null=True, blank=True)
    visible = models.BooleanField(default=False)

    class Meta:
        db_table = "BlogEntry"

    @classmethod
    def object_type(cls):
        return "blogentry"

    def __str__(self):
        return "BlogEntry-" + str(self.id) + " " + self.url_name

    def create(self, author):
        self.article = Article(name="Untitled")

    def to_json(self):
        return {
            "id": self.id,
            "articleId": self.article_id,
            "visible": self.visible,
            "urlName": self.url_name,
            "discussionId": self.discussion_id,
        }

    def add_to_state(self, state):
        state.add(self)
        state.add(self.article)
