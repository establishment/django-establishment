from establishment.funnel.base_views import JSONResponse


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
