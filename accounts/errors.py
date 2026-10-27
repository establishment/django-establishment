from establishment.utils.errors import APIError


# Errors due to unavailability of the requested action
class AlreadyLoggedIn(APIError):
    code = 3000
    default_message = "You're already logged in. Try refreshing the page."


class EmailUnavailable(APIError):
    code = 3001
    default_message = "Email address is already in use"


class UsernameUnavailable(APIError):
    code = 3002
    default_message = "Username is already in use"


class PrimaryEmailRemoval(APIError):
    code = 3003
    default_message = "Email address is primary, can't remove"


# Errors due to invalid information provided
class InvalidCaptcha(APIError):
    code = 3004
    default_message = "Invalid captcha"


class InvalidUsername(APIError):
    code = 3005
    default_message = "Username is invalid"


class InvalidSocialAccount(APIError):
    code = 3006
    default_message = "Social account doesn't exist"


class InvalidEmailAddress(APIError):
    code = 3007
    default_message = "Invalid email address"


class InvalidLoginCredentials(APIError):
    code = 3008
    default_message = "The e-mail address and/or password you specified are not correct"


class InvalidSocialAccountRemoval(APIError):
    code = 3009
    default_message = "Can't remove social account for other user"


class WrongPassword(APIError):
    code = 3010
    default_message = "Wrong password"


class MissingPassword(APIError):
    code = 3011
    default_message = "Missing password field"


class InvalidPasswordResetToken(APIError):
    code = 3012
    default_message = "Invalid password token"


# Errors due to abuse of services
class TooManyPasswordResets(APIError):
    code = 3013
    default_message = "You may request another password reset later"


class TooManyProfilesRequested(APIError):
    code = 3014
    default_message = "Requesting too many users"


class TooManySignUps(APIError):
    code = 3015
    default_message = "Too many users created from your IP"
