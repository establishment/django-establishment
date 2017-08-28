from django.core.exceptions import ObjectDoesNotExist, PermissionDenied, ValidationError
from django.db import IntegrityError

from establishment.errors.errors import BaseError
from establishment.errors.models import ErrorMessage


class ErrorMessageProcessingMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    @staticmethod
    def process_exception(request, exception):
        if isinstance(exception, ObjectDoesNotExist):
            exception = BaseError.OBJECT_NOT_FOUND

        if isinstance(exception, PermissionDenied):
            exception = BaseError.NOT_ALLOWED

        if isinstance(exception, ValidationError):
            exception = BaseError.INVALID_DATA

        if isinstance(exception, IntegrityError):
            exception = BaseError.INVALID_DATA

        if isinstance(exception, ErrorMessage):
            return exception.to_response()

        return None
