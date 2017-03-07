from establishment.funnel.base_views import get_remote_ip


class RequestVisitor(object):
    def __init__(self, request):
        self.request = request

    def ip(self):
        return get_remote_ip(self.request)

    def unique(self):
        if self.request.user.is_authenticated():
            return "user-" + str(self.request.user.id)
        else:
            return "ip-" + self.ip()


class VisitorMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.visitor = RequestVisitor(request)

        return self.get_response(request)

    @staticmethod
    def process_exception(request, exception):
        return None
