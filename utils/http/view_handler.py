from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, ClassVar, Callable, Any, Literal, TypeVar, Unpack

from django.conf import settings
from django.core.exceptions import DisallowedHost
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.urls import URLPattern, re_path, path

from establishment.utils.errors import BadRequest, HTTPMethodNotAllowed, Throttled
from establishment.utils.http.permissions import Permission, allow_any
from establishment.utils.http.renderers import to_pure_camel_case_json
from establishment.utils.http.view_context import get_raw_view_context
from establishment.utils.throttling import Throttle


@dataclass
class ViewConfig:
    method: Literal["GET", "POST"] = "GET"
    permissions: Optional[Permission] = None
    throttle: Optional[Throttle] = None
    url_path: Optional[str] = None
    dev_only: Optional[bool] = None
    with_read_right: bool = False  # TODO @establify with_read_rights should be a permission mixin


class ViewSet:
    permissions: ClassVar[Permission] = allow_any
    throttle: ClassVar[Throttle] = Throttle.DEFAULT
    dev_only: ClassVar[bool] = False

    def __init__(self, permissions: Optional[Permission] = None, throttle: Optional[Throttle] = None):
        self._permissions = permissions
        self._throttle = throttle

    def add_view_config_defaults(self, view_config: ViewConfig):
        # TODO @establify using a mix of class and instance
        if view_config.permissions is None:
            view_config.permissions = self._permissions or self.permissions
        if view_config.throttle is None:
            view_config.throttle = self._throttle or self.throttle
        if view_config.dev_only is None:
            view_config.dev_only = self.dev_only

    def make_view_decorator(self, **kwargs: Unpack[ViewConfig]) -> Callable:
        view_config = ViewConfig(**kwargs)
        self.add_view_config_defaults(view_config)

        def wrapper(func: CallableT) -> CallableT:
            name = func.__name__
            setattr(self, name, func)
            return add_view_config(view_config)(func)

        return wrapper

    def get(self, **kwargs: Unpack[ViewConfig]) -> Callable:
        return self.make_view_decorator(method="GET", **kwargs)

    def post(self, **kwargs: Unpack[ViewConfig]) -> Callable:
        return self.make_view_decorator(method="POST", **kwargs)

    def make_view(self, view_config: ViewConfig, view_func: Callable) -> BaseView:
        return BaseView(view_config, view_func, self)

    def build_url_patterns(self) -> list[URLPattern]:
        urlpatterns: list[URLPattern] = []

        for action_name in dir(self):
            view_func = getattr(self, action_name)
            view_config = getattr(view_func, "view_config", None)
            if view_config is None:
                continue

            self.add_view_config_defaults(view_config)

            view = self.make_view(view_config, view_func)
            if view.dev_only and not settings.ENABLE_DEV_ROUTES:
                continue

            url_path: str = view.url_path

            if not url_path or url_path == "/":
                # Empty paths should never be used in view-sets
                raise RuntimeError("NO EMPTY URLS!")

            if "(?P" in url_path:
                django_path_func = re_path
            else:
                django_path_func = path

            # TODO @cleanup nooooooooooo
            # Ensure the all URLs have a trailing slash
            if not url_path.endswith("/"):
                url_path += "/"

            urlpatterns.append(django_path_func(url_path, view))

            # Also adding the version of the URL without the trailing space.
            if len(url_path) > 1 and url_path.endswith("/"):
                urlpatterns.append(django_path_func(url_path[:-1], view))

        return urlpatterns


class BaseView:
    def __init__(self, config: ViewConfig, func: Callable, view_set: ViewSet):
        self.config = config
        self.func = func
        self.view_set = view_set

        assert config.permissions is not None
        assert config.throttle is not None

        # TODO @establify ensure these are filled in
        self.method = config.method
        self.permissions = config.permissions
        self.throttle = config.throttle
        self.url_path = config.url_path if config.url_path is not None else func.__name__
        self.dev_only = config.dev_only

        self.load_view_arguments: Callable[[], list[Any]] = self.make_argument_loader()

    def __call__(self, request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
        try:
            self.validate_request(request)
            with self.permissions.get_permission_filter():
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
        self.permissions.check_permission()

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
