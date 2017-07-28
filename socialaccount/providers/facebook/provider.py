from django.conf import settings
from django.utils.crypto import get_random_string

from establishment.socialaccount.providers.base import ProviderAccount, AuthAction
from establishment.socialaccount.providers.oauth2.provider import OAuth2Provider

GRAPH_API_VERSION = getattr(settings, "SOCIAL_ACCOUNT_PROVIDERS", {}).get("facebook",  {}).get("VERSION", "v2.7")
GRAPH_API_URL = "https://graph.facebook.com/" + GRAPH_API_VERSION

NONCE_SESSION_KEY = "accounts_facebook_nonce"
NONCE_LENGTH = 32


class FacebookAccount(ProviderAccount):
    def __str__(self):
        return self.account.extra_data.get("name") or super().__str__()

    def get_profile_url(self):
        return self.account.extra_data.get("link")

    def get_avatar_url(self):
        uid = str(self.account.uid)
        # Ask for a 600x600 pixel image. We might get smaller but
        # image will always be highest res possible and square.
        return GRAPH_API_URL + "/" + uid + "/picture?type=square&height=600&width=600&return_ssl_resources=1"


class FacebookProvider(OAuth2Provider):
    name = "Facebook"
    account_class = FacebookAccount

    def get_default_scope(self):
        return ["email"]

    def get_fields(self):
        default_fields = [
            "id",
            "email",
            "name",
            "first_name",
            "last_name",
            "verified",
            "locale",
            "timezone",
            "link",
            "gender",
            "updated_time"]
        return self.get_settings().get("FIELDS", default_fields)

    def get_auth_params(self, request, action):
        ret = super(FacebookProvider, self).get_auth_params(request, action)
        if action == AuthAction.REAUTHENTICATE:
            ret["auth_type"] = "reauthenticate"
        else:
            ret["auth_type"] = "rerequest"
        return ret

    def get_fb_login_options(self, request):
        ret = self.get_auth_params(request, "authenticate")
        ret["scope"] = ",".join(self.get_scope(request))
        if ret.get("auth_type") == "reauthenticate":
            ret["auth_nonce"] = self.get_nonce(request, or_create=True)
        return ret

    def get_nonce(self, request, or_create=False, pop=False):
        if pop:
            nonce = request.session.pop(NONCE_SESSION_KEY, None)
        else:
            nonce = request.session.get(NONCE_SESSION_KEY)
        if not nonce and or_create:
            nonce = get_random_string(32)
            request.session[NONCE_SESSION_KEY] = nonce
        return nonce

    def extract_uid(self, data):
        return data["id"]

    def extract_common_fields(self, data):
        return dict(email=data.get("email"),
                    username=data.get("username"),
                    first_name=data.get("first_name"),
                    last_name=data.get("last_name"),
                    name=data.get("name"))

    def extract_email_addresses(self, data):
        from establishment.accounts.models import EmailAddress
        result = []
        email = data.get("email")
        if email:
            # Note: data["verified"] does not necessarily imply the email address is verified.
            result.append(EmailAddress(email=email, primary=True))
        return result
