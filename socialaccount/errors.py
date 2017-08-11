from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class SocialAccountError(ErrorList):
    GENERIC_INVALID_PROCESS = get_error(message="Invalid login process")
    INVALID_SOCIAL_TOKEN = get_error(message="Invalid social token")

    INVALID_GOOGLE_ACCOUNT = get_error(message="Error accessing Google user profile")

    INVALID_FACEBOOK_ACCOUNT = get_error(message="Error accessing Facebook account")
    FACEBOOK_ACCOUNT_NO_EMAIL = get_error(message="Your Facebook account is not linked to an email address."
                                                  "We require an email address to log you in.")
