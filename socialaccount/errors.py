from establishment.utils.errors_deprecated import get_error, ErrorList


class SocialAccountError(ErrorList):
    GENERIC_INVALID_PROCESS = get_error("Invalid login process")
    INVALID_SOCIAL_TOKEN = get_error("Invalid social token")

    INVALID_SOCIAL_ACCOUNT = get_error("Error accessing external account (Facebook/Google/etc.)")

    SOCIAL_ACCOUNT_NO_EMAIL = get_error("Your external account (Facebook/Google/etc.) is not linked to an email address."
                                                  "We require an email address to log you in.")
