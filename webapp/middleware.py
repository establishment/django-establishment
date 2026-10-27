# TODO @Mihai maybe remove some of these?
from typing import Optional, TYPE_CHECKING

from django.http import HttpRequest

from .base_views import get_remote_ip

if TYPE_CHECKING:
    from .throttle import ActionThrottler


class RequestVisitor(object):
    def __init__(self, request: HttpRequest) -> None:
        self.request = request

    def ip(self) -> str:
        return get_remote_ip(self.request)

    def unique(self) -> str:
        if self.request.user.is_authenticated:
            return "user-" + str(self.request.user.id)
        else:
            return "ip-" + self.ip()

    def get_throttler(self, name: str, unauth_limit: tuple[int, int], auth_limit: Optional[tuple[int, int]] = None) -> ActionThrottler:
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
