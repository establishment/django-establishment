from datetime import timedelta

from django.conf import settings
from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.utils import timezone

from establishment.accounts.utils import get_request_param
from establishment.socialaccount.helpers import complete_social_login
from establishment.socialaccount.models import SocialToken, SocialLogin, SocialProvider
from establishment.socialaccount.providers.oauth2.client import OAuth2Client, OAuth2Error
from ..base import AuthAction, AuthError


class OAuth2Adapter(object):
    expires_in_key = "expires_in"
    supports_state = True
    redirect_uri_protocol = None  # None: use DEFAULT_HTTP_PROTOCOL
    access_token_method = "POST"
    login_cancelled_error = "access_denied"
    scope_delimiter = " "
    basic_auth = False
    headers = None

    def get_provider(self):
        return SocialProvider.get_by_name(self.provider_id)

    def complete_login(self, request, app, access_token, **kwargs):
        """
        Returns a SocialLogin instance
        """
        raise NotImplementedError

    def parse_token(self, data):
        token = SocialToken(token=data["access_token"])
        token.token_secret = data.get("refresh_token", "")
        expires_in = data.get(self.expires_in_key, None)
        if expires_in:
            token.expires_at = timezone.now() + timedelta(seconds=int(expires_in))
        return token


class OAuth2View(object):
    @classmethod
    def adapter_view(cls, adapter):
        def view(request, *args, **kwargs):
            self = cls()
            self.request = request
            self.adapter = adapter()
            return self.dispatch(request, *args, **kwargs)
        return view

    def get_client(self, request, app):
        callback_url = reverse(self.adapter.provider_id + "_callback")
        protocol = self.adapter.redirect_uri_protocol or settings.DEFAULT_HTTP_PROTOCOL
        callback_url = request.build_absolute_uri(callback_url)
        provider = self.adapter.get_provider()
        scope = provider.get_scope(request)
        client = OAuth2Client(self.request, app.client_id, app.secret_key,
                              self.adapter.access_token_method,
                              self.adapter.access_token_url,
                              callback_url,
                              scope,
                              scope_delimiter=self.adapter.scope_delimiter,
                              headers=self.adapter.headers,
                              basic_auth=self.adapter.basic_auth)
        return client


class OAuth2LoginView(OAuth2View):
    def dispatch(self, request):
        provider = self.adapter.get_provider()
        app = provider.get_app(self.request)
        client = self.get_client(request, app)
        action = request.GET.get("action", AuthAction.AUTHENTICATE)
        auth_url = self.adapter.authorize_url
        auth_params = provider.get_auth_params(request, action)
        client.state = SocialLogin.stash_state(request)
        try:
            return HttpResponseRedirect(client.get_redirect_url(
                auth_url, auth_params))
        except OAuth2Error as e:
            raise RuntimeError("Failed to login with social")


class OAuth2CallbackView(OAuth2View):
    def dispatch(self, request):
        if "error" in request.GET or "code" not in request.GET:
            # Distinguish cancel from error
            auth_error = request.GET.get("error", None)
            if auth_error == self.adapter.login_cancelled_error:
                error = AuthError.CANCELLED
            else:
                error = AuthError.UNKNOWN
            raise RuntimeError("Failed to login with social")
        app = self.adapter.get_provider().get_app(self.request)
        client = self.get_client(request, app)
        try:
            access_token = client.get_access_token(request.GET['code'])
            token = self.adapter.parse_token(access_token)
            token.app = app
            login = self.adapter.complete_login(request, app, token, response=access_token)
            login.token = token
            if self.adapter.supports_state:
                login.state = SocialLogin.verify_and_unstash_state(request, get_request_param(request, 'state'))
            else:
                login.state = SocialLogin.unstash_state(request)
            return complete_social_login(request, login)
        except (PermissionDenied, OAuth2Error) as e:
            raise RuntimeError("Failed to login with social")
