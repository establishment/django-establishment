"""
File to keep basic view classes (for instance for ajax requests, etc.)
"""
from django.http import JsonResponse, HttpResponseBadRequest, Http404

from establishment.funnel.encoder import StreamJSONEncoder


class HTTPRenderer(object):
    pass


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


def login_required(function=None):
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_authenticated:
                if request.is_ajax():
                    from establishment.errors.errors import BaseError
                    return BaseError.USER_NOT_AUTHENTICATED
                return global_renderer.render_error_message(request, "Please login", "You need to login to continue."
                                                                       "You can login from the navbar (upper right corner)")
            return view_func(request, *args, **kwargs)
        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)


def superuser_required(function=None):
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.user.is_superuser:
                if request.is_ajax():
                    from establishment.errors.errors import BaseError
                    return BaseError.NOT_ALLOWED
                raise Http404()
            return view_func(request, *args, **kwargs)

        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)


def login_required_ajax(function=None):
    """
    Just make sure the user is authenticated to access a certain ajax view
    """
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.is_ajax():
                return HttpResponseBadRequest()
            if not request.user.is_authenticated:
                from establishment.errors.errors import BaseError
                return BaseError.USER_NOT_AUTHENTICATED
            return view_func(request, *args, **kwargs)
        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)


def ajax_required(function=None):
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.is_ajax():
                return HttpResponseBadRequest()
            return view_func(request, *args, **kwargs)
        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)


def single_page_app(function):
    def _decorator(view_func):
        def _wrapped_view(request, *args, **kwargs):
            if not request.is_ajax():
                return global_renderer.render_single_page_app(request)
            return view_func(request, *args, **kwargs)
        return _wrapped_view

    if function is None:
        return _decorator
    else:
        return _decorator(function)
