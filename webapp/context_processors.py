from django.conf import settings

from ..funnel.encoder import StreamJSONEncoder
from .templatetags.json_safe import json_safe


def websocket_url(request):
    """
    Adds the url of the websocket, depending on if
    """
    protocol = request.is_secure() and 'wss://' or 'ws://'

    # TODO: shouldn't use request.get_host() here
    if getattr(settings, "ENABLE_LIVE_WEBSOCKETS", False):
        protocol = "wss://"
        url = protocol + "ws1." + request.get_host() + "/"
    else:
        url = protocol + request.get_host() + "/ws/"

    return {
        "WEBSOCKET_URL": url
    }


def user_json(request):
    user_dict = {}
    if request.user.is_authenticated:
        user_dict = request.user.to_json()
    user_dict["isAuthenticated"] = bool(request.user.is_authenticated)
    if request.user.is_authenticated:
        user_dict.update(request.user.get_custom_settings().to_json())

    return {
        "USER": json_safe(StreamJSONEncoder.dumps(user_dict)),
    }
