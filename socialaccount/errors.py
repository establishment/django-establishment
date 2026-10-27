from establishment.utils.errors import APIError


class GenericInvalidProcess(APIError):
    code = 3100
    default_message = "Invalid login process"


class InvalidSocialToken(APIError):
    code = 3101
    default_message = "Invalid social token"


class InvalidExternalAccount(APIError):
    code = 3102
    default_message = "Error accessing external account (Facebook/Google/etc.)"


class SocialAccountNoEmail(APIError):
    code = 3103
    default_message = ("Your external account (Facebook/Google/etc.) is not linked to an email address. "
                       "We require an email address to log you in.")
