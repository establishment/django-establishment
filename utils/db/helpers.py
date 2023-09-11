from typing import Optional, TypeVar

from django.db import connections as django_connections
from django.db.models import Model

from establishment.utils.db.permission_filter import PermissionFilterSoftDeletionMixin, PermissionFilterMixin
from establishment.utils.db.soft_deletion import SoftDeletionMixin
from establishment.utils.state import State


# Reset all DB connections.
# WARNING: Should only be used in worker threads, as in atomic operations for instance it will corrupt your commit.
def reset_db_connections() -> None:
    for conn in django_connections.all():
        conn.close()


DBObject = TypeVar("DBObject", bound=Model)


def lock_db_object(obj: DBObject) -> DBObject:
    model = obj._meta.model
    model_manager = model.objects
    if issubclass(model, PermissionFilterSoftDeletionMixin):
        model_manager = model.all_unfiltered_objects
    elif issubclass(model, SoftDeletionMixin):
        model_manager = model.all_objects
    elif issubclass(model, PermissionFilterMixin):
        model_manager = model.unfiltered_objects
    # TODO: Maybe a single query?
    model_manager.select_for_update().get(pk=obj.pk)
    obj.refresh_from_db()
    return obj


def delete_db_object(obj: Model, state: Optional[State] = None) -> State:
    if state is None:
        state = State()
    state.add_delete_event(obj)
    obj.delete()
    return state
