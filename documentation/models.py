from django.db import models

from establishment.content.models import Article
from establishment.funnel.stream import StreamObjectMixin


class DocumentationEntry(StreamObjectMixin):
    url_name = models.CharField(max_length=64, null=True, blank=True)
    name = models.CharField(max_length=255, null=True, blank=True)
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="+")
    # TODO: this should really be an array field of foreign keys to sub_entries, to preserve order,
    # django doesn't support this yet
    parent = models.ForeignKey("DocumentationEntry", on_delete=models.CASCADE, related_name="sub_entries", null=True, blank=True)
    parent_index = models.IntegerField(default=0)

    class Meta:
        db_table = "DocumentationEntry"
        unique_together = ("parent", "url_name")

    def __str__(self):
        return "DocumentationEntry " + str(self.id) + " " + self.name + " /" + self.url_name

    def to_json(self):
        return {
            "id": self.id,
            "urlName": self.url_name,
            "name": self.name,
            "articleId": self.article_id,
            "parentId": self.parent_id,
            "parentIndex": self.parent_index
        }

    def add_to_state(self, state, user=None):
        state.add(self)
        state.add(self.article)
        for sub_entry in self.sub_entries.all():
            sub_entry.add_to_state(state)
