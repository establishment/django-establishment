from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, ClassVar, Callable, Any, Literal, TypeVar

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpRequest, HttpResponse, JsonResponse

from establishment.utils.errors import BadRequest, HTTPMethodNotAllowed, Throttled
from establishment.utils.http.permissions import Permission, allow_any
from establishment.utils.http.renderers import to_pure_camel_case_json
from establishment.utils.http.view_context import get_raw_view_context
from establishment.utils.throttling import Throttle


@dataclass
class ViewConfig:
    method: Literal["GET", "POST"] = "GET"
    permission: Optional[Permission] = None
    throttle: Optional[Throttle] = None
    url_path: Optional[str] = None
    dev_only: Optional[bool] = None
    with_read_right: bool = False  # TODO @establify with_read_rights should be a permission mixin


class ViewSet:
    permission: ClassVar[Permission] = allow_any
    throttle: ClassVar[Throttle] = Throttle.DEFAULT
    dev_only: ClassVar[bool] = False


class BaseView:
    def __init__(self, config: ViewConfig, name: str, view_set_cls: type[ViewSet]):
        self.method = config.method
        self.permission = config.permission if config.permission is not None else view_set_cls.permission
        self.throttle = config.throttle if config.throttle is not None else view_set_cls.throttle
        self.url_path = config.url_path if config.url_path is not None else name  # TODO deprecate
        self.dev_only = config.dev_only if config.dev_only is not None else view_set_cls.dev_only
        self.name = name
        self.config = config
        self.view_set_cls = view_set_cls
        self.load_view_arguments: Callable[[], list[Any]] = self.make_argument_loader()

    def __call__(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        try:
            self.validate_request(request)
            with self.permission.get_permission_filter():
                response = self.process_request(request)
                return self.format_response(response)
        except Exception as exception:
            return self.handle_exception(request, exception)

    # Ensure that the incoming request is permitted or raise an error
    def validate_request(self, request: HttpRequest):
        view_context = get_raw_view_context()
        assert view_context is not None

        # Check the host
        try:
            view_context.view_request.get_host()
        except DisallowedHost:
            raise BadRequest

        # Check the method
        view_method = (view_context.view_request.method or "").upper()
        if self.method is not None and view_method != self.method:
            raise HTTPMethodNotAllowed(f"HTTP Method {view_method} not allowed")

        # Check throttling
        if not settings.DISABLE_THROTTLING:
            if self.throttle.throttle_request(view_context.ip):
                raise Throttled

        # Check permission filters
        self.permission.check_permission()

    def format_response(self, response: Any) -> HttpResponse:
        if not isinstance(response, HttpResponse):
            # If the view does not return an HTTP request, assume it's JSON-serializable.
            response = JsonResponse(to_pure_camel_case_json(response))

        # Add the Content-Length header to responses if not already set.
        if not response.has_header("Content-Length"):
            response["Content-Length"] = str(len(response.content))

        return response

    def handle_exception(self, request: HttpRequest, exception: Exception) -> HttpResponse: raise NotImplementedError

    def process_request(self, request: HttpRequest) -> Any: raise NotImplementedError

    def make_argument_loader(self) -> Callable[[], list[Any]]: raise NotImplementedError


CallableT = TypeVar("CallableT", bound=Callable)


def view_action(view_config: ViewConfig) -> Callable[[CallableT], CallableT]:
    def wrapper(view_set_method: CallableT) -> CallableT:
        setattr(view_set_method, "view_config", view_config)
        return view_set_method

    return wrapper
