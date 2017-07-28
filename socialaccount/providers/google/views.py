import logging

import requests
from oauth2client import client

from establishment.funnel.base_views import ajax_required, JSONResponse, JSONErrorResponse
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialToken, SocialLogin
from .provider import GoogleProvider

logger = logging.getLogger("django")


def google_complete_login(request, app, token):
    provider = GoogleProvider.get_instance()
    credentials = client.credentials_from_code(app.client_id, app.secret_key, provider.get_default_scope(), token.token)
    token.expires_at = credentials.token_expiry
    if credentials.refresh_token:
        token.token_secret = credentials.refresh_token
    return provider.social_login_from_response(request, credentials.id_token)


@ajax_required
def login_by_token(request):
    auth_exception = None
    data = request.POST
    try:
        app = GoogleProvider.get_instance().get_app(request)
        access_token = data["code"]

        token = SocialToken(app=app, token=access_token)
        login = google_complete_login(request, app, token)
        login.token = token
        login.state = SocialLogin.state_from_request(request)
        complete_social_login(request, login)
        return JSONResponse({"success": True})
    except requests.RequestException as e:
        logger.exception("Error accessing Google user profile")
        auth_exception = e
    except Exception as e:
        logger.exception("Invalid google token")
        pass
    return JSONErrorResponse(auth_exception or "Invalid token")
