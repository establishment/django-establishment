from typing import Optional

from django.http import HttpResponse, HttpRequest
from django.utils.cache import patch_vary_headers
from django.utils.deprecation import MiddlewareMixin

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]
CORS_ALLOW_METHODS = ["OPTIONS", "GET", "POST"]
CORS_PREFLIGHT_MAX_AGE = 86400


class CorsMiddleware(MiddlewareMixin):
    def process_request(self, request: HttpRequest) -> Optional[HttpResponse]:
        if request.method == "OPTIONS" and "HTTP_ACCESS_CONTROL_REQUEST_METHOD" in request.META:
            response = HttpResponse()
            response["Content-Length"] = "0"
            return response
        return None

    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        patch_vary_headers(response, ("Origin", ))
        # This needs to be added on every response, no matter whether it's OPTIONS, GET or POST.
        response["Access-Control-Allow-Origin"] = "*"
        if request.method == "OPTIONS":
            response["Access-Control-Allow-Headers"] = ", ".join(CORS_ALLOW_HEADERS)
            response["Access-Control-Allow-Methods"] = ", ".join(CORS_ALLOW_METHODS)
            response["Access-Control-Max-Age"] = CORS_PREFLIGHT_MAX_AGE
        return response
