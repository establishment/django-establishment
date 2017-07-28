from establishment.socialaccount.providers.base import ProviderAccount, AuthAction
from establishment.socialaccount.providers.oauth2.provider import OAuth2Provider

GITHUB_TOKEN_LINK = "https://github.com/login/oauth/access_token"
GITHUB_QUERY_LINK = "https://api.github.com/user"


class GithubAccount(ProviderAccount):
    def __str__(self):
        return self.account.extra_data.get("name") or super().__str__()

    def get_profile_url(self):
        return self.account.extra_data.get("html_url")

    def get_avatar_url(self):
        return self.account.extra_data.get("avatar_url")


class GithubProvider(OAuth2Provider):
    name = "Github"
    account_class = GithubAccount

    def get_default_scope(self):
        return ["email"]

    def extract_uid(self, data):
        return data["id"]

    def extract_common_fields(self, data):
        return dict(
            email=data["email"],
            username=data["login"],
            name=data["name"],
        )
