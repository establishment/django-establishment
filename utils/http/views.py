from __future__ import annotations

from typing import Optional, Callable, TypeVar, ClassVar

from establishment.utils.http.permissions import Permission, allow_any
from establishment.utils.throttling import Throttle


class ViewConfig:
    def __init__(self,
                 method: Optional[str],
                 permission: Optional[Permission],
                 throttle: Optional[Throttle],
                 url_path: Optional[str],
                 dev_only: Optional[bool],
                 with_read_rights: bool):  # TODO @establify with_read_rights should be a permission mixin
        self.method = method
        self.permission = permission
        self.throttle = throttle
        self.url_path = url_path
        self.dev_only = dev_only
        self.with_read_right = with_read_rights


T = TypeVar("T", bound=Callable)


def action(view_config: ViewConfig) -> Callable[[T], T]:
    def wrapper(view_set_method: T) -> T:
        setattr(view_set_method, "view_config", view_config)
        return view_set_method

    return wrapper


def post_action(permission: Optional[Permission] = None,
                throttle: Optional[Throttle] = None,
                url_path: Optional[str] = None,
                dev_only: Optional[bool] = None,
                with_read_rights: bool = False) -> Callable[[T], T]:
    return action(ViewConfig("POST", permission, throttle, url_path, dev_only, with_read_rights))


def get_action(permission: Optional[Permission] = None,
               throttle: Optional[Throttle] = None,
               url_path: Optional[str] = None,
               dev_only: Optional[bool] = None,
               with_read_rights: bool = True) -> Callable[[T], T]:
    return action(ViewConfig("GET", permission, throttle, url_path, dev_only, with_read_rights))


class ViewSet:
    permission: ClassVar[Permission] = allow_any
    throttle: ClassVar[Throttle] = Throttle.DEFAULT
    dev_only: ClassVar[bool] = False
