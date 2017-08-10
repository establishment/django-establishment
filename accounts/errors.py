from establishment.errors.errors import ErrorList
from establishment.errors.models import get_error


class AccountsError(ErrorList):
    # Errors due to unavailability of the requested action
    ALREADY_LOGGED_IN = get_error(message="You're already logged in")
    EMAIL_UNAVAILABLE = get_error(message="Email address is already in")
    USERNAME_UNAVAILABLE = get_error(message="Username is already in use")
    PRIMARY_EMAIL_REMOVAL = get_error(message="Email address is primary, can't remove")

    # Errors due to invalid information provided
    INVALID_CAPTCHA = get_error(message="Invalid captcha")
    INVALID_USERNAME = get_error(message="Username is invalid")
    INVALID_SOCIAL_ACCOUNT = get_error(message="Social account doesn't exist")
    INVALID_EMAIL_ADDRESS = get_error(message="Invalid email address")
    INVALID_LOGIN_CREDENTIALS = get_error(message="The e-mail address and/or password you specified are not correct")
    INVALID_SOCIAL_ACCOUNT_REMOVAL = get_error(message="Can't remove social account for other user")
    WRONG_PASSWORD = get_error(message="Wrong password")
    MISSING_PASSWORD = get_error(message="Missing password field")
    INVALID_PASSWORD_RESET_TOKEN = get_error(message="Invalid password token")

    # Errors due to abuse of services
    TOO_MANY_PASSWORD_RESETS = get_error(message="You may request another password reset later")
    TOO_MANY_PROFILES_REQUESTED = get_error(message="Requesting too many users")
    TOO_MANY_SIGN_UPS = get_error(message="Too many users created from your IP")
