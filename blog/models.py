from typing import Any

from django.db import models

from establishment.content.models import Article
from establishment.chat.models import Commentable
from establishment.utils.state import State


class BlogEntry(Commentable):
    url_name = models.CharField(max_length=256, unique=True)
    article = models.OneToOneField(Article, on_delete=models.PROTECT, null=True, blank=True)
    visible = models.BooleanField(default=False)

    class Meta:
        db_table = "BlogEntry"

    def __str__(self):
        return "BlogEntry-" + str(self.id) + " " + self.url_name

    def to_json(self) -> dict[str, Any]:
        rez = super().to_json()
        rez["lastActive"] = self.get_discussion_last_activity()
        return rez

    def add_to_state(self, state: State):
        state.add(self)
        state.add(self.article)
