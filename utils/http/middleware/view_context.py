from typing import Optional, Any

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin

from establishment.utils.errors import UnsupportedMediaType, ParseError
from establishment.utils.http.view_context import BaseViewContext, _current_view_context, get_raw_view_context_or_raise
from establishment.utils.http.view_handler import BaseView
from utils.http.error_response import error_response


class BaseViewContextMiddleware(MiddlewareMixin):
    def create_view_context(self, request: HttpRequest) -> BaseViewContext: raise NotImplementedError

    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        view_context = self.create_view_context(request)

        try:
            view_context.parse_request()
        except (UnsupportedMediaType, ParseError) as exception:
            # TODO @establify centralize all instances of error_response usage
            return error_response(request, exception)

        _current_view_context.set(view_context)

        return None

    # Called right before the view
    def process_view(self, request: HttpRequest, view_func: BaseView, view_args: tuple[Any], view_kwargs: dict[str, Any]):
        view_context = get_raw_view_context_or_raise()
        view_context.set_view(view_func, view_args, view_kwargs)

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        _current_view_context.set(None)
        return response

    def process_exception(self, request: HttpRequest, exception: Exception):
        _current_view_context.set(None)
        return None
