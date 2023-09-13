from typing import Any

from django.http import HttpRequest, HttpResponse

from establishment.utils.errors import InternalServerError, BadRequest, PermissionDenied, NotFound
from establishment.utils.http.view_handler import BaseView


def default_error_response_500(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
    return BaseView.handle_exception(request, InternalServerError())


def default_error_response_400(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
    return BaseView.handle_exception(request, BadRequest())


def default_error_response_403(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
    return BaseView.handle_exception(request, PermissionDenied())


def default_error_response_404(request: HttpRequest, *args: Any, **kwargs: Any) -> HttpResponse:
    return BaseView.handle_exception(request, NotFound())
