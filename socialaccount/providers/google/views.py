import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import requests

from establishment.socialaccount.errors import SocialAccountError
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialToken, SocialLogin
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.view_context import BaseViewContext
from establishment.webapp.view_set import WebappViewSet
from .provider import GoogleProvider

logger = logging.getLogger("django")

google_views = WebappViewSet()


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


class GoogleLoginRequest(BaseRequest):
    code: str
    # The social login state reads it from the raw request
    process: Optional[str] = None


@google_views.post(url_path=r"^google/login/token/$")
def login_by_token(request: GoogleLoginRequest, view_context: BaseViewContext) -> dict[str, Any]:
    raw_request = view_context.raw_request
    try:
        app = GoogleProvider.get_instance().get_app(raw_request)

        token = SocialToken(app=app, token=request.code)
        login = google_complete_login(raw_request, app, token)
        login.token = token
        login.state = SocialLogin.state_from_request(raw_request)
        complete_social_login(raw_request, login)
        return {"success": True}
    except requests.RequestException:
        logger.exception("Error accessing Google user profile")
        raise SocialAccountError.INVALID_SOCIAL_ACCOUNT
    except Exception:
        logger.exception("Invalid google token")
    raise SocialAccountError.INVALID_SOCIAL_TOKEN
