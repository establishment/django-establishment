from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional, Any, TypedDict, Callable

from establishment.utils.http.permissions import Permission
from establishment.utils.bound_types import CallableT
from establishment.utils.throttling import Throttle

ViewMethod = Literal["GET", "POST"]


#  TODO @establify no dataclass
@dataclass
class ViewConfig:
    method: ViewMethod = "GET"
    permissions: Optional[Permission] = None
    throttle: Optional[Throttle] = None
    url_path: Optional[str] = None
    dev_only: Optional[bool] = None
    with_read_right: bool = False  # TODO @establify with_read_rights should be a permission mixin
    extra: dict[str, Any] = field(default_factory=dict)


# What can be overriden per individual view
# The method is extra
class ViewConfigOverrides(TypedDict, total=False):
    permissions: Permission
    throttle: Throttle
    url_path: str
    dev_only: bool
    with_read_right: bool
    extra: dict


def add_view_config(view_config: ViewConfig) -> Callable[[CallableT], CallableT]:
    def wrapper(view_set_method: CallableT) -> CallableT:
        setattr(view_set_method, "view_config", view_config)
        return view_set_method

    return wrapper
