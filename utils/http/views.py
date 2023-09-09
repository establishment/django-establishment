from __future__ import annotations

from typing import Optional, ClassVar

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


class ViewSet:
    permission: ClassVar[Permission] = allow_any
    throttle: ClassVar[Throttle] = Throttle.DEFAULT
    dev_only: ClassVar[bool] = False
