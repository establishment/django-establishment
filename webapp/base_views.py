from typing import Any

from django.http import JsonResponse

from establishment.funnel.encoder import StreamJSONEncoder


class HTTPRenderer(object):
    render_single_page_app: Any
    render_error_message: Any


global_renderer = HTTPRenderer()


def default_render_error_message(request, title, message):
    pass


def default_single_page_app(request):
    pass


global_renderer.render_error_message = default_render_error_message
global_renderer.render_single_page_app = default_single_page_app


def get_remote_ip(request):
    """
    Method that can be used to get the ip (filled in by apache/nginx) from a request object
    You don't normally want to use this, but rather have all requests wrapped in a middleware that fills in request.ip
    You can change it to fit your needs, but only trust values your webserver fills in
    Default is REMOTE_ADDR from webserver, which django makes HTTP_REMOTE_ADDR
    """
    return request.META.get("HTTP_REMOTE_ADDR", request.META.get("REMOTE_ADDR", ""))


class JSONResponse(JsonResponse):
    def __init__(self, data, cls=StreamJSONEncoder, **kwargs):
        super().__init__(data, cls, **kwargs)
