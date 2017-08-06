from django.conf import settings
from django.contrib.auth import get_user_model

from establishment.misc.util import import_module_attribute
from establishment.socialaccount.adapter import populate_user


class AuthProcess(object):
    LOGIN = "login"
    CONNECT = "connect"


class AuthAction(object):
    AUTHENTICATE = "authenticate"
    REAUTHENTICATE = "reauthenticate"


class AuthError(object):
    UNKNOWN = "unknown"
    CANCELLED = "cancelled"  # Cancelled on request of user
    DENIED = "denied"  # Denied by server


class Provider(object):
    instance = None
    db_instance = None

    @classmethod
    def get_instance(cls, name=None, package=None, *args, **kwargs):
        if cls.instance is None:
            cls.instance = cls()
            if name:
                cls.id = name
            if package:
                cls.package = package
        return cls.instance

    @classmethod
    def set_db_instance(cls, db_instance):
        cls.db_instance = db_instance

    @classmethod
    def get_db_instance(cls):
        return cls.db_instance

    def get_urlpatterns(self):
        return import_module_attribute(self.package + ".urls.urlpatterns", [])

    def get_app(self, request):
        # NOTE: Avoid loading models at top due to registry boot...
        from establishment.socialaccount.models import SocialApp

        return SocialApp.objects.get_current(self.id, request)

    def wrap_account(self, social_account):
        return self.account_class(social_account)

    def get_settings(self):
        return settings.SOCIAL_ACCOUNT_PROVIDERS.get(self.id, {})

    def social_login_from_response(self, request, response):
        """
        Instantiates and populates a `SocialLogin` model based on the data
        retrieved in `response`. The method does NOT save the model to the
        DB.

        Data for `SocialLogin` will be extracted from `response` with the
        help of the `.extract_uid()`, `.extract_extra_data()`,
        `.extract_common_fields()`, and `.extract_email_addresses()`
        methods.

        :param request: a Django `HttpRequest` object.
        :param response: object retrieved via the callback response of the
            social auth provider.
        :return: A populated instance of the `SocialLogin` model (unsaved).
        """
        # NOTE: Avoid loading models at top due to registry boot...
        from establishment.socialaccount.models import SocialLogin, SocialAccount

        uid = self.extract_uid(response)
        extra_data = self.extract_extra_data(response)
        common_fields = self.extract_common_fields(response)
        socialaccount = SocialAccount(extra_data=extra_data, uid=uid, provider_instance=self.get_db_instance())
        email_addresses = self.extract_email_addresses(response)
        self.cleanup_email_addresses(common_fields.get('email'), email_addresses)
        social_login = SocialLogin(account=socialaccount, email_addresses=email_addresses)
        user_model = get_user_model()
        user = social_login.user = user_model()
        user.set_unusable_password()
        populate_user(request, social_login, common_fields)
        return social_login

    def extract_uid(self, data):
        """
        Extracts the unique user ID from `data`
        """
        raise NotImplementedError("The provider must implement the `extract_uid()` method")

    def extract_extra_data(self, data):
        """
        Extracts fields from `data` that will be stored in `SocialAccount`'s `extra_data` JSONField.

        :return: any JSON-serializable Python structure.
        """
        return data

    def extract_common_fields(self, data):
        """
        Extracts fields from `data` that will be used to populate the
        `User` model in the `SOCIALACCOUNT_ADAPTER`'s `populate_user()`
        method.

        For example:

            {'first_name': 'John'}

        :return: dictionary of key-value pairs.
        """
        return {}

    @staticmethod
    def cleanup_email_addresses(email, addresses):
        # Move user.email over to EmailAddress
        from establishment.accounts.models import EmailAddress
        if email and email.lower() not in [a.email.lower() for a in addresses]:
            addresses.append(EmailAddress(email=email, primary=True))

    def extract_email_addresses(self, data):
        # TODO: the default method should still do some work
        return []


class ProviderAccount(object):
    def __init__(self, social_account):
        self.account = social_account

    def __str__(self):
        return self.get_brand()["name"]

    def get_profile_url(self):
        return None

    def get_avatar_url(self):
        return None

    def get_brand(self):
        """
        Returns a dict containing an id and name identifying the brand. Useful when displaying
        logos next to accounts in templates.

        For most providers, these are identical to the provider. For OpenID however, the brand
        can derived from the OpenID identity url.
        """
        provider = self.account.get_provider()
        return dict(id=provider.id, name=provider.name)
