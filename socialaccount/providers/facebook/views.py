import hashlib
import hmac
import logging

import requests

from establishment.socialaccount.errors import SocialAccountError
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialLogin, SocialToken
from establishment.webapp.base_views import ajax_required
from .provider import FacebookProvider, GRAPH_API_URL

logger = logging.getLogger("django")


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
        })
    resp.raise_for_status()
    return provider.social_login_from_response(request, resp.json())


@ajax_required
def login_by_token(request):
    data = request.POST
    try:
        provider = FacebookProvider.get_instance()
        login_options = provider.get_fb_login_options(request)
        app = provider.get_app(request)
        access_token = data["accessToken"]
        if login_options.get("auth_type") == "reauthenticate":
            info = requests.get(GRAPH_API_URL + "/oauth/access_token_info",
                                params={"client_id": app.client_id,
                                        "access_token": access_token}).json()
            nonce = provider.get_nonce(request, pop=True)
            ok = nonce and nonce == info.get("auth_nonce")
        else:
            ok = True
        if ok and provider.get_settings().get("EXCHANGE_TOKEN"):
            resp = requests.get(GRAPH_API_URL + "/oauth/access_token",
                                params={"grant_type": "fb_exchange_token",
                                        "client_id": app.client_id,
                                        "client_secret": app.secret_key,
                                        "fb_exchange_token": access_token}).json()
            access_token = resp["access_token"]
        if ok:
            token = SocialToken(app=app, token=access_token)
            login = fb_complete_login(request, app, token)
            login.token = token
            login.state = SocialLogin.state_from_request(request)
            complete_social_login(request, login)
            return {"success": True}
    except requests.RequestException as e:
        logger.exception("Error accessing FB user profile")
        return SocialAccountError.INVALID_SOCIAL_ACCOUNT
    return SocialAccountError.INVALID_SOCIAL_TOKEN
