from contextvars import ContextVar
from functools import cached_property
from typing import Optional, Any

from django.http import HttpRequest
from django.utils.datastructures import MultiValueDict

from establishment.utils.errors import InternalServerError
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_parser import parse_request_data


class BaseViewContext:
    def __init__(self, raw_request: HttpRequest):
        from establishment.utils.http.view_handler import BaseView

        self.raw_request = raw_request
        self.raw_body: Optional[bytes] = None
        self.data: dict[str, Any] = dict()
        self.files: Optional[MultiValueDict] = None

        self.view: Optional[BaseView] = None
        self.view_args: tuple[Any, ...] = ()
        self.view_kwargs: dict[str, Any] = {}
        self.typed_view_args: list[Any] = []
        self.typed_request: Optional[BaseRequest] = None

    def parse_request(self):
        raw_body, data, files = parse_request_data(self.raw_request)
        self.raw_body = raw_body
        self.data = data
        self.files = files

    @cached_property
    def ip(self) -> str:
        # list of proxy ip addresses (separated by comma followed by space):
        #   - the left-most one is the original client ip (can be forged so we cannot trust it)
        #   - the right-most one is the one that hit the load balancer (most reliable source of information)
        x_forwarded_for = self.raw_request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for is None:
            # In production, this will be the load balancer (our proxy), or just 0.0.0.0 if all else fails.
            # This will never be reached while we still use AWS's load balancer, since they guarantee to
            # put a valid IP address in the X-Forwarded-For header.
            return self.raw_request.META.get("REMOTE_ADDR") or "0.0.0.0"
        return x_forwarded_for.split(",")[-1].strip()

    @cached_property
    def user_agent(self) -> str:
        user_agent_string = self.raw_request.META.get("HTTP_USER_AGENT", "")
        if isinstance(user_agent_string, bytes):
            user_agent_string = user_agent_string.decode("utf-8")
        return user_agent_string or ""


_current_view_context: ContextVar[Optional[BaseViewContext]] = ContextVar("current_view_context", default=None)


def get_raw_view_context() -> Optional[BaseViewContext]:
    return _current_view_context.get()


def get_raw_view_context_or_raise() -> BaseViewContext:
    view_context = get_raw_view_context()
    if view_context is None:
        raise InternalServerError
    return view_context
