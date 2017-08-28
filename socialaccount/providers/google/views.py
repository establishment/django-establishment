import logging

import requests
from oauth2client import client

from establishment.socialaccount.errors import SocialAccountError
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialToken, SocialLogin
from establishment.webapp.base_views import ajax_required
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
    data = request.POST
    try:
        app = GoogleProvider.get_instance().get_app(request)
        access_token = data["code"]

        token = SocialToken(app=app, token=access_token)
        login = google_complete_login(request, app, token)
        login.token = token
        login.state = SocialLogin.state_from_request(request)
        complete_social_login(request, login)
        return {"success": True}
    except requests.RequestException as e:
        logger.exception("Error accessing Google user profile")
        return SocialAccountError.INVALID_SOCIAL_ACCOUNT
    except Exception as e:
        logger.exception("Invalid google token")
    return SocialAccountError.INVALID_SOCIAL_TOKEN
