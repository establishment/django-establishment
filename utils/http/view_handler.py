from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, ClassVar, Callable, Any, Literal, TypeVar, Unpack

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
    permission: Optional[Permission] = None  # TODO Rename to permissions
    throttle: Optional[Throttle] = None
    url_path: Optional[str] = None
    dev_only: Optional[bool] = None
    with_read_right: bool = False  # TODO @establify with_read_rights should be a permission mixin


class ViewSet:
    permission: ClassVar[Permission] = allow_any
    throttle: ClassVar[Throttle] = Throttle.DEFAULT
    dev_only: ClassVar[bool] = False

    def add_view_config_defaults(self, view_config: ViewConfig):
        if view_config.permission is None:
            view_config.permission = self.permission
        if view_config.throttle is None:
            view_config.throttle = self.throttle
        if view_config.dev_only is None:
            view_config.dev_only = self.dev_only

    def make_view(self, **kwargs: Unpack[ViewConfig]):
        view_config = ViewConfig(**kwargs)
        self.add_view_config_defaults(view_config)

        def wrapper(func: CallableT) -> CallableT:
            name = func.__name__
            setattr(self, name, func)
            return add_view_config(view_config)(func)

        return wrapper

    def get(self, **kwargs: Unpack[ViewConfig]):
        return self.make_view(method="GET", **kwargs)

    def post(self, **kwargs: Unpack[ViewConfig]):
        return self.make_view(method="POST", **kwargs)


class BaseView:
    def __init__(self, config: ViewConfig, func: Callable, view_set: ViewSet):
        self.config = config
        self.func = func
        self.view_set = view_set

        assert config.permission is not None
        assert config.throttle is not None

        # TODO @establify ensure these are filled in
        self.method = config.method
        self.permission = config.permission
        self.throttle = config.throttle
        self.url_path = config.url_path if config.url_path is not None else func.__name__
        self.dev_only = config.dev_only

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

        # Check throttling -- Should also include per user
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


def add_view_config(view_config: ViewConfig) -> Callable[[CallableT], CallableT]:
    def wrapper(view_set_method: CallableT) -> CallableT:
        setattr(view_set_method, "view_config", view_config)
        return view_set_method

    return wrapper
