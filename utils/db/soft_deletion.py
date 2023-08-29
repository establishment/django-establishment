from __future__ import annotations

from typing import TypeVar, Any

from django.db.models import Manager, QuerySet, Model, DateTimeField
from django.utils import timezone


M = TypeVar("M", bound=Model, covariant=True)


class SoftDeletionQuerySet(QuerySet[M]):
    def delete(self) -> tuple[int, dict[str, int]]:
        count = super().update(deleted_at=timezone.now())
        return count, {self.model._meta.label: count}

    def alive(self) -> QuerySet[M]:
        return self.filter(deleted_at=None)

    def dead(self) -> QuerySet[M]:
        return self.exclude(deleted_at=None)


class SoftDeletionManager(Manager[M]):
    def __init__(self, alive_only: bool = True):
        self.alive_only = alive_only
        super().__init__()

    def get_queryset(self) -> QuerySet[M]:
        if self.alive_only:
            return SoftDeletionQuerySet(self.model).alive()
        return SoftDeletionQuerySet(self.model)


class SoftDeletionMixin(Model):
    deleted_at = DateTimeField(blank=True, null=True)

    all_objects: SoftDeletionManager

    class Meta:
        abstract = True

    def delete(self, using: Any = None, keep_parents: bool = False) -> tuple[int, dict[str, int]]:
        self.deleted_at = timezone.now()
        self.save()
        return 1, {self._meta.label: 1}

    def hard_delete(self) -> tuple[int, dict[str, int]]:
        return super().delete()

    def is_alive(self) -> bool:
        return self.deleted_at is None
