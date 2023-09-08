from __future__ import annotations

from contextvars import ContextVar
from types import TracebackType
from typing import TypeVar, Optional, Any

from django.db.models import QuerySet, Manager, Model, Q

from establishment.utils.db.soft_deletion import SoftDeletionManager, SoftDeletionMixin


class PermissionFilter:
    _permission_filters_stack: ContextVar[Optional[list[PermissionFilter]]] = ContextVar("permission_filters_stack", default=None)

    @classmethod
    def get_permission_filters_stack(cls) -> list[PermissionFilter]:
        stack = cls._permission_filters_stack.get()
        if stack is None:
            stack = []
            cls._permission_filters_stack.set(stack)
        return stack

    def __init__(self, query: Q, model: Optional[type[Model]] = None, models: Optional[tuple[type[Model], ...]] = None):
        if models is None:
            assert model is not None
            models = (model,)
        self.models = models
        self.query = query

    def __enter__(self) -> PermissionFilter:
        self.get_permission_filters_stack().append(self)
        return self

    def __exit__(self,
                 exc_type: Optional[type[BaseException]],
                 exc_value: Optional[BaseException],
                 traceback: Optional[TracebackType]):
        stk = self.get_permission_filters_stack()
        assert len(stk) > 0 and stk[-1] == self
        stk.pop()


T = TypeVar("T", bound=Model)


class PermissionFilterManager(Manager[T]):
    use_in_migrations = False

    def __init__(self, filtered_only: bool = True, **kwargs: Any):
        super().__init__(**kwargs)
        self.filtered_only = filtered_only

    def get_queryset(self) -> QuerySet[T]:
        qs = super().get_queryset()
        if self.filtered_only:
            for permission_filter in PermissionFilter.get_permission_filters_stack():
                if self.model in permission_filter.models:
                    qs = qs.filter(permission_filter.query)
        return qs


class PermissionFilterMixin(Model):
    unfiltered_objects: PermissionFilterManager

    class Meta:
        abstract = True


class PermissionFilterSoftDeletionManager(PermissionFilterManager[T], SoftDeletionManager[T]):
    pass


class PermissionFilterSoftDeletionMixin(SoftDeletionMixin):
    all_objects: PermissionFilterSoftDeletionManager
    unfiltered_objects: PermissionFilterSoftDeletionManager
    all_unfiltered_objects: PermissionFilterSoftDeletionManager

    class Meta:
        abstract = True
