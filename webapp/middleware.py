from establishment.webapp.base_views import JSONResponse


class ProcessResponseMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if type(response) == dict:
            response = JSONResponse(response)
        if hasattr(response, "to_response"):
            response = response.to_response()
        return response

    @staticmethod
    def process_exception(request, exception):
        return None


from .base_views import get_remote_ip


class RequestVisitor(object):
    def __init__(self, request):
        self.request = request

    def ip(self):
        return get_remote_ip(self.request)

    def unique(self):
        if self.request.user.is_authenticated:
            return "user-" + str(self.request.user.id)
        else:
            return "ip-" + self.ip()

    def get_throttler(self, name, unauth_limit, auth_limit=None):
        from .throttle import ActionThrottler, UserActionThrottler

        if self.request.user.is_authenticated:
            auth_limit = auth_limit or unauth_limit
            return UserActionThrottler(self.request.user, name, *auth_limit)
        else:
            return ActionThrottler("ip-" + self.ip() + "-" + name, *unauth_limit)


class VisitorMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.visitor = RequestVisitor(request)

        return self.get_response(request)

    @staticmethod
    def process_exception(request, exception):
        return None


# Middleware that only allows login for admins
class AdminOnlyMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not request.user.is_authenticated or not request.user.is_superuser:
            if request.is_ajax():
                from establishment.accounts.views import user_login_view
                return user_login_view(request)
            else:
                from establishment.webapp.base_views import global_renderer
                return global_renderer.render_single_page_app(request)

        return self.get_response(request)
