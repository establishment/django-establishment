import hashlib
import hmac
import logging
from typing import Any, Optional

import requests

from establishment.socialaccount.errors import SocialAccountError
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialLogin, SocialToken
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.view_context import BaseViewContext
from establishment.webapp.view_set import WebappViewSet
from .provider import FacebookProvider, GRAPH_API_URL

logger = logging.getLogger("django")

facebook_views = WebappViewSet()


def compute_appsecret_proof(app, token):
    # Generate an appsecret_proof parameter to secure the Graph API call
    # see https://developers.facebook.com/docs/graph-api/securing-requests
    msg = token.token.encode("utf-8")
    key = app.secret_key.encode("utf-8")
    appsecret_proof = hmac.new(key, msg, digestmod=hashlib.sha256).hexdigest()
    return appsecret_proof


def fb_complete_login(request, app, token):
    provider = FacebookProvider.get_instance()
    resp = requests.get(
        GRAPH_API_URL + "/me",
        params={
            "fields": ",".join(provider.get_fields()),
            "access_token": token.token,
            "appsecret_proof": compute_appsecret_proof(app, token)
        },
        timeout=10)
    resp.raise_for_status()
    return provider.social_login_from_response(request, resp.json())


class FacebookLoginRequest(BaseRequest):
    access_token: str
    # The social login state reads these from the raw request
    next: Optional[str] = None
    process: Optional[str] = None


@facebook_views.post(url_path=r"^facebook/login/token/$")
def login_by_token(request: FacebookLoginRequest, view_context: BaseViewContext) -> dict[str, Any]:
    raw_request = view_context.raw_request
    try:
        provider = FacebookProvider.get_instance()
        login_options = provider.get_fb_login_options(raw_request)
        app = provider.get_app(raw_request)
        access_token = request.access_token
        if login_options.get("auth_type") == "reauthenticate":
            info = requests.get(
                GRAPH_API_URL + "/oauth/access_token_info",
                params={
                    "client_id": app.client_id,
                    "access_token": access_token
                },
                timeout=10
            ).json()
            nonce = provider.get_nonce(raw_request, pop=True)
            ok = nonce and nonce == info.get("auth_nonce")
        else:
            ok = True
        if ok and provider.get_settings().get("EXCHANGE_TOKEN"):
            resp = requests.get(
                GRAPH_API_URL + "/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": app.client_id,
                    "client_secret": app.secret_key,
                    "fb_exchange_token": access_token
                },
                timeout=10
            ).json()
            access_token = resp["access_token"]
        if ok:
            token = SocialToken(app=app, token=access_token)
            login = fb_complete_login(raw_request, app, token)
            login.token = token
            login.state = SocialLogin.state_from_request(raw_request)
            complete_social_login(raw_request, login)
            return {"success": True}
    except requests.RequestException:
        logger.exception("Error accessing FB user profile")
        raise SocialAccountError.INVALID_SOCIAL_ACCOUNT
    except Exception:
        logger.exception("Invalid facebook token")
    raise SocialAccountError.INVALID_SOCIAL_TOKEN
