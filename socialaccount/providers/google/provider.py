from establishment.socialaccount.providers.base import ProviderAccount, AuthAction

from establishment.socialaccount.providers.oauth2.provider import OAuth2Provider


class GoogleAccount(ProviderAccount):
    def __str__(self):
        return self.account.extra_data.get("name") or super().__str__()

    def get_profile_url(self):
        return "https://plus.google.com/" + self.account.uid

    def get_avatar_url(self):
        return self.account.extra_data.get("picture")


class GoogleProvider(OAuth2Provider):
    name = "Google"
    account_class = GoogleAccount

    def get_default_scope(self):
        return ["profile", "email"]

    def get_auth_params(self, request, action):
        ret = super().get_auth_params(request, action)
        if action == AuthAction.REAUTHENTICATE:
            ret["approval_prompt"] = "force"
        return ret

    def extract_uid(self, data):
        return str(data["sub"])

    def extract_common_fields(self, data):
        return dict(email=data.get("email"),
                    last_name=data.get("family_name"),
                    first_name=data.get("given_name"))

    def extract_email_addresses(self, data):
        from establishment.accounts.models import EmailAddress
        result = []
        email = data.get("email")
        if email:
            result.append(EmailAddress(email=email, primary=True))
        return result
