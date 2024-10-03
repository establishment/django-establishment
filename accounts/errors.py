from establishment.utils.errors_deprecated import get_error, ErrorList


class AccountsError(ErrorList):
    # Errors due to unavailability of the requested action
    ALREADY_LOGGED_IN = get_error("You're already logged in. Try refreshing the page.")
    EMAIL_UNAVAILABLE = get_error("Email address is already in")
    USERNAME_UNAVAILABLE = get_error("Username is already in use")
    PRIMARY_EMAIL_REMOVAL = get_error("Email address is primary, can't remove")

    # Errors due to invalid information provided
    INVALID_CAPTCHA = get_error("Invalid captcha")
    INVALID_USERNAME = get_error("Username is invalid")
    INVALID_SOCIAL_ACCOUNT = get_error("Social account doesn't exist")
    INVALID_EMAIL_ADDRESS = get_error("Invalid email address")
    INVALID_LOGIN_CREDENTIALS = get_error("The e-mail address and/or password you specified are not correct")
    INVALID_SOCIAL_ACCOUNT_REMOVAL = get_error("Can't remove social account for other user")
    WRONG_PASSWORD = get_error("Wrong password")
    MISSING_PASSWORD = get_error("Missing password field")
    INVALID_PASSWORD_RESET_TOKEN = get_error("Invalid password token")

    # Errors due to abuse of services
    TOO_MANY_PASSWORD_RESETS = get_error("You may request another password reset later")
    TOO_MANY_PROFILES_REQUESTED = get_error("Requesting too many users")
    TOO_MANY_SIGN_UPS = get_error("Too many users created from your IP")
