from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class SocialAccountError(ErrorList):
    GENERIC_INVALID_PROCESS = get_error(message="Invalid login process")
    INVALID_SOCIAL_TOKEN = get_error(message="Invalid social token")

    INVALID_SOCIAL_ACCOUNT = get_error(message="Error accessing external account (Facebook/Google/etc.)")

    SOCIAL_ACCOUNT_NO_EMAIL = get_error(message="Your external account (Facebook/Google/etc.) is not linked to an email address."
                                                  "We require an email address to log you in.")
