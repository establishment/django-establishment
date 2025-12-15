from typing import TypeVar, Callable, Optional

from django.db.models import QuerySet, Model

from establishment.utils.pydantic import PageQuery
from establishment.utils.state import State, StateObjectList

T = TypeVar("T", bound=Model)


def paginate_entries(entries: QuerySet[T], page_query: PageQuery) -> QuerySet[T]:
    start_index = (page_query.page - 1) * page_query.page_size
    end_index = start_index + page_query.page_size
    return entries[start_index: end_index]


def paginate_to_state(objects: QuerySet[T],
                      page_query: PageQuery,
                      wrapper: Optional[Callable[[T], Optional[StateObjectList]]] = None,
                      bulk_wrapper: Optional[Callable[[QuerySet[T]], Optional[StateObjectList]]] = None,
                      extra: Optional[dict] = None,
                      state: Optional[State] = None) -> State:
    paginated_objects = paginate_entries(objects, page_query)
    if state is None:
        state = State(extra=extra)
    else:
        state.add_extra(extra)
    if wrapper is not None:
        for obj in paginated_objects:
            state.add(wrapper(obj))
    elif bulk_wrapper is not None:
        state.add(bulk_wrapper(paginated_objects))
    else:
        state.add(paginated_objects)
    if page_query.include_count:
        num_objects = objects.count()
        state.add_extra({
            "count": num_objects,
            "countPages": (num_objects + page_query.page_size - 1) // page_query.page_size
        })

    return state
