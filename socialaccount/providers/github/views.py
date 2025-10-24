import logging

import requests
from django.shortcuts import render

from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialLogin, SocialToken
from establishment.socialaccount.errors import SocialAccountError
from .provider import GithubProvider, GITHUB_TOKEN_LINK, GITHUB_QUERY_LINK

logger = logging.getLogger("django")


def github_complete_login(request, token):
    provider = GithubProvider.get_instance()
    response = requests.get(GITHUB_QUERY_LINK,
                            headers={"Authorization": "token {}".format(token.token)},
                            timeout=10)
    response.raise_for_status()
    return provider.social_login_from_response(request, response.json())


def login_by_token(request):
    try:
        app = GithubProvider.get_instance().get_app(request)
        code = request.GET["code"]

        response = requests.post(GITHUB_TOKEN_LINK,
                                 params={"client_id": app.client_id,
                                         "client_secret": app.secret_key,
                                         "code": code},
                                 headers={"Accept": "application/json"},
                                 timeout=10)
        response.raise_for_status()
        response_data = response.json()

        access_token = response_data["access_token"]

        token = SocialToken(app=app, token=access_token)
        login = github_complete_login(request, token)
        login.token = token
        login.state = SocialLogin.state_from_request(request)
        complete_social_login(request, login)
        return render(request, "account/autoclose.html", None)
    except requests.RequestException as e:
        logger.exception("Error accessing Github user profile")
        return SocialAccountError.INVALID_SOCIAL_ACCOUNT
    except Exception as e:
        logger.exception("Invalid github token")
    return SocialAccountError.INVALID_SOCIAL_TOKEN
