from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class SocialAccountError(ErrorList):
    GENERIC_INVALID_PROCESS = get_error(message="Invalid login process")

    INVALID_GOOGLE_ACCOUNT = get_error(message="Error accessing Google user profile")
    INVALID_GOOGLE_TOKEN = get_error(message="Invalid google token")

    INVALID_GITHUB_TOKEN = get_error(message="Invalid github token")

    INVALID_FACEBOOK_ACCOUNT = get_error(message="Error accessing Facebook account")
    INVALID_FACEBOOK_TOKEN = get_error(message="Invalid facebook token")
    FACEBOOK_ACCOUNT_NO_EMAIL = get_error(message="Your Facebook account is not linked to an email address."
                                                  "We require an email address to log you in.")
