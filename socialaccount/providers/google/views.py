import logging
from datetime import datetime, timedelta

import requests

from establishment.socialaccount.errors import SocialAccountError
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialToken, SocialLogin
from establishment.webapp.base_views import ajax_required
from .provider import GoogleProvider

logger = logging.getLogger("django")


def google_complete_login(request, app, token):
    provider = GoogleProvider.get_instance()

    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": token.token,
            "client_id": app.client_id,
            "client_secret": app.secret_key,
            "redirect_uri": "postmessage",
            "grant_type": "authorization_code",
        },
        timeout=10
    )
    token_response.raise_for_status()
    token_data = token_response.json()

    access_token = token_data.get("access_token")
    refresh_token = token_data.get("refresh_token")
    expires_in = token_data.get("expires_in", 3600)

    token.token = access_token
    token.expires_at = datetime.now() + timedelta(seconds=expires_in)
    if refresh_token:
        token.token_secret = refresh_token

    user_info_response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10
    )
    user_info_response.raise_for_status()
    user_data = user_info_response.json()

    if "id" in user_data and "sub" not in user_data:
        user_data["sub"] = user_data["id"]

    return provider.social_login_from_response(request, user_data)


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
