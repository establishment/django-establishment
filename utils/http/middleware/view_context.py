from typing import Optional, Any

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin

from establishment.utils.errors import UnsupportedMediaType, ParseError
from establishment.utils.http.view_context import BaseViewContext
from establishment.utils.http.view_handler import BaseView


class BaseViewContextMiddleware(MiddlewareMixin):
    def create_view_context(self, request: HttpRequest) -> BaseViewContext: raise NotImplementedError

    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        view_context = self.create_view_context(request)

        try:
            view_context.parse_request()
        except (UnsupportedMediaType, ParseError) as exception:
            return BaseView.handle_exception(request, exception)

        return None

    # Called right before the view
    def process_view(self, request: HttpRequest, view_func: BaseView, view_args: tuple[Any], view_kwargs: dict[str, Any]) -> None:
        view_context = BaseViewContext.get()
        view_context.set_view(view_func, view_args, view_kwargs)

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        BaseViewContext.clear()
        return response

    def process_exception(self, request: HttpRequest, exception: Exception) -> None:
        BaseViewContext.clear()
