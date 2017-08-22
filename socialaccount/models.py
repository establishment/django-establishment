from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.postgres.fields import JSONField
from django.contrib.sites.models import Site
from django.core.exceptions import PermissionDenied
from django.db import models
from django.utils.crypto import get_random_string
from django.utils.encoding import force_text
from django.utils.http import is_safe_url

from establishment.accounts.models import EmailAddress, UnverifiedEmail
from establishment.accounts.utils import get_request_param
from establishment.misc.util import import_module_attribute


class SocialProvider(models.Model):
    instance_cache = dict()
    name_cache = None

    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return "Social Provider " + self.name

    def get_provider(self):
        return self.instance_cache[self.id]

    @classmethod
    def load_provider(cls, provider_name):
        package = provider_name
        if "." not in package:
            package = "establishment.socialaccount.providers." + package
        provider_class = import_module_attribute(package + ".provider")
        return provider_class.get_instance(provider_name, package)

    @classmethod
    def provider_list(cls):
        cls.ensure_instances_loaded()
        return [value for key, value in sorted(cls.name_cache.items())]

    @classmethod
    def providers_as_choices(cls):
        return [(provider.id, provider.name) for provider in cls.provider_list()]

    @classmethod
    def ensure_instances_loaded(cls):
        if cls.name_cache is not None:
            return
        cls.name_cache = {}
        for provider_name in getattr(settings, "SOCIAL_ACCOUNT_PROVIDERS", {}):
            provider_instance = cls.load_provider(provider_name)
            cls.name_cache[provider_name] = provider_instance

    @classmethod
    def load(cls):
        cls.ensure_instances_loaded()
        for provider_name in getattr(settings, "SOCIAL_ACCOUNT_PROVIDERS", {}):
            db_instance, created = cls.objects.get_or_create(name=provider_name)
            instance = cls.name_cache[provider_name]

            cls.instance_cache[db_instance.id] = instance
            instance.set_db_instance(db_instance)

    @classmethod
    def get_by_name(cls, provider_name):
        return cls.name_cache[provider_name]


class SocialAppManager(models.Manager):
    def get_current(self, provider, request=None):
        site = Site.objects.get_current(request)
        return self.get(sites__id=site.id, provider_instance=SocialProvider.get_by_name(provider).get_db_instance())


class SocialApp(models.Model):
    objects = SocialAppManager()

    provider_instance = models.ForeignKey(SocialProvider, on_delete=models.PROTECT)
    name = models.CharField(max_length=40)
    client_id = models.CharField(max_length=256, help_text="App ID, or consumer key")
    secret_key = models.CharField(max_length=256, help_text="API secret, client secret, or consumer secret")
    key = models.CharField(max_length=256, blank=True)
    # Some apps can be used across multiple domains
    sites = models.ManyToManyField(Site, blank=True)

    class Meta:
        db_table = "SocialApp"

    def __str__(self):
        return self.name

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "clientId": self.client_id,
            "key": self.key,
        }


class SocialAccount(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    provider_instance = models.ForeignKey(SocialProvider, on_delete=models.PROTECT)
    uid = models.CharField(max_length=512, unique=True)
    last_login = models.DateTimeField(auto_now=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    extra_data = JSONField(default=dict)

    class Meta:
        db_table = "SocialAccount"
        unique_together = (("provider_instance", "uid"))

    def __str__(self):
        return force_text(self.user)

    def authenticate(self):
        return authenticate(account=self)

    def get_profile_name(self):
        return str(self.get_provider_account())

    def get_profile_url(self):
        return self.get_provider_account().get_profile_url()

    def get_avatar_url(self):
        return self.get_provider_account().get_avatar_url()

    def get_provider(self):
        return self.provider_instance.get_provider()

    def get_provider_account(self):
        return self.get_provider().wrap_account(self)

    def to_json(self):
        return {
            "name": self.get_profile_name(),
            "link": self.get_profile_url(),
            "picture": self.get_avatar_url(),
            "platform": self.get_provider().name,
            "id": self.id
        }


# TODO: rename to SocialAppToken
class SocialToken(models.Model):
    app = models.ForeignKey(SocialApp, on_delete=models.PROTECT)
    account = models.ForeignKey(SocialAccount, on_delete=models.CASCADE)
    token = models.TextField(help_text="oauth_token (OAuth1) or access token (OAuth2)")
    token_secret = models.TextField(blank=True, help_text="oauth_token_secret (OAuth1) or refresh token (OAuth2)")
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = "SocialAppToken"
        unique_together = ("app", "account")

    def __str__(self):
        return self.token


class SocialLogin(object):
    """
    Represents a social user that is in the process of being logged
    in. This consists of the following information:
    `account` (`SocialAccount` instance): The social account being
    logged in. Providers are not responsible for checking whether or
    not an account already exists or not. Therefore, a provider
    typically creates a new (unsaved) `SocialAccount` instance. The
    `User` instance pointed to by the account (`account.user`) may be
    prefilled by the provider for use as a starting point later on
    during the signup process.
    `token` (`SocialToken` instance): An optional access token token
    that results from performing a successful authentication
    handshake.
    `state` (`dict`): The state to be preserved during the
    authentication handshake. Note that this state may end up in the
    url -- do not put any secrets in here. It currently only contains
    the url to redirect to after login.
    `email_addresses` (list of `EmailAddress`): Optional list of
    e-mail addresses retrieved from the provider.
    """

    def __init__(self, user=None, account=None, token=None, email_addresses=[]):
        # TODO: account should be renamed to social_account
        if token:
            assert token.account is None or token.account == account
        self.token = token
        self.user = user
        self.account = account
        self.email_addresses = email_addresses
        self.state = {}

    def connect(self, user):
        self.user = user
        self.save()

    def save(self):
        """
        Saves a new account. Note that while the account is new,
        the user may be an existing one (when connecting accounts)
        """
        assert self.is_temporary()
        user = self.user
        temporary_email = False
        if not user.email:
            user.email = self.email_addresses[0].email
            temporary_email = True
        user.save()
        self.account.user = user
        self.account.save()
        if self.token:
            self.token.account = self.account
            self.token.save()
        for email in self.email_addresses:
            try:
                EmailAddress.objects.get(email=email.email, user__isnull=False)
            except EmailAddress.DoesNotExist:
                if email.primary:
                    if not user.email or temporary_email:
                        user.email = email.email
                        user.save()
                        temporary_email = False
                    else:
                        email.primary = False
                email.user = user
                email.save()
                UnverifiedEmail.objects.filter(email__iexact=email.email).delete()

    def is_temporary(self):
        """
        :return: True if account is temporary and not yet in the database
        """
        return not self.account.pk

    def lookup(self):
        """
        Lookup existing account, if any.
        """
        assert self.is_temporary()
        try:
            a = SocialAccount.objects.get(provider_instance=self.account.provider_instance, uid=self.account.uid)
            # Update account
            a.extra_data = self.account.extra_data
            self.account = a
            self.user = self.account.user
            a.save()
            # Update token
            if self.token:
                assert not self.token.pk
                try:
                    t = SocialToken.objects.get(account=self.account, app=self.token.app)
                    t.token = self.token.token
                    if self.token.token_secret:
                        # only update the refresh token if we got one
                        # many oauth2 providers do not resend the refresh token
                        t.token_secret = self.token.token_secret
                    t.expires_at = self.token.expires_at
                    t.save()
                    self.token = t
                except SocialToken.DoesNotExist:
                    self.token.account = a
                    self.token.save()
        except SocialAccount.DoesNotExist:
            pass

    def get_redirect_url(self, request):
        url = self.state.get("next")
        return url

    @classmethod
    def state_from_request(cls, request):
        state = {}

        next_url = get_request_param(request, "next")
        if not is_safe_url(next_url):
            next_url = None
        if next_url:
            state["next"] = next_url
        state["process"] = get_request_param(request, "process", "login")
        state["scope"] = get_request_param(request, "scope", "")
        state["auth_params"] = get_request_param(request, "auth_params", "")
        return state

    @classmethod
    def stash_state(cls, request):
        state = cls.state_from_request(request)
        verifier = get_random_string()
        request.session["socialaccount_state"] = (state, verifier)
        return verifier

    @classmethod
    def unstash_state(cls, request):
        if "socialaccount_state" not in request.session:
            raise PermissionDenied()
        state, verifier = request.session.pop("socialaccount_state")
        return state

    @classmethod
    def verify_and_unstash_state(cls, request, verifier):
        if "socialaccount_state" not in request.session:
            raise PermissionDenied()
        state, verifier2 = request.session.pop("socialaccount_state")
        if verifier != verifier2:
            raise PermissionDenied()
        return state
