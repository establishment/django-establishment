import logging
from collections.abc import Iterable
from typing import Any, Optional

from django.conf import settings
from django.contrib.auth import authenticate as django_authenticate, get_user_model
from django.contrib.auth import logout as django_logout
from django.contrib.auth.tokens import default_token_generator as password_reset_token_generator
from django.contrib.sites.models import Site
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import HttpResponse, HttpResponseRedirect
from django.utils.http import base36_to_int, int_to_base36

from establishment.utils.errors import NotFound, PermissionDenied
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.view_arguments_loaders import URLArg
from establishment.utils.http.view_context import BaseViewContext
from establishment.utils.state import State
from establishment.webapp.base_views import global_renderer
from establishment.webapp.middleware import RequestVisitor
from establishment.webapp.throttle import ActionThrottler, UserActionThrottler
from establishment.webapp.view_set import WebappViewSet
from .adapter import keep_session_after_password_change, login, perform_login
from .errors import (
    AlreadyLoggedIn,
    EmailUnavailable,
    InvalidCaptcha,
    InvalidEmailAddress,
    InvalidLoginCredentials,
    InvalidPasswordResetToken,
    InvalidSocialAccount,
    InvalidSocialAccountRemoval,
    InvalidUsername,
    MissingPassword,
    PrimaryEmailRemoval,
    TooManyPasswordResets,
    TooManyProfilesRequested,
    TooManySignUps,
    UsernameUnavailable,
    WrongPassword,
)
from .models import AbstractStreamObjectUser, EmailAddress, UnverifiedEmail, TempUser, UserSummary, UserGroup, UserGroupMember, UserNotification
from .recaptcha_client import test_recaptcha
from .utils import send_template_mail, get_public_user_class

logger = logging.getLogger("django.request")

accounts_views = WebappViewSet()
# Routed at the site's root rather than under accounts/
accounts_root_views = WebappViewSet()

# TODO: this should be moved to settings
MAX_SIGNUPS_PER_IP_PER_DAY = 300


class SignupRequest(BaseRequest):
    email: str
    password: str = ""
    recaptcha_key: Optional[str] = None
    username: Optional[str] = None
    country_id: Optional[int] = None  # -1 for no country


@accounts_views.post()
def signup_request(request: SignupRequest, user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> dict[str, Any]:
    if user is not None:
        raise AlreadyLoggedIn

    if not test_recaptcha(request.recaptcha_key):
        # TODO: log this error
        raise InvalidCaptcha

    if not ActionThrottler("user_signup_" + RequestVisitor(view_context.raw_request).ip(), 24 * 3600, MAX_SIGNUPS_PER_IP_PER_DAY).increm():
        raise TooManySignUps

    if EmailAddress.objects.filter(email__iexact=request.email).exists():
        raise EmailUnavailable

    unverified_email = UnverifiedEmail.create(email=request.email)
    if unverified_email is None:
        raise InvalidEmailAddress

    extra: dict[str, Any] = {}
    if request.country_id is not None and request.country_id != -1:
        from establishment.localization.models import Country
        if Country.objects.filter(id=request.country_id).exists():
            extra["countryId"] = request.country_id

    if request.username:
        new_user = get_user_model()(email=request.email, password=request.password)
        if new_user.has_field("username"):
            new_user.username = request.username
            if get_user_model().objects.filter(username=request.username).exists():
                raise UsernameUnavailable
            try:
                new_user.full_clean()
            except DjangoValidationError:
                raise InvalidUsername
            extra["username"] = request.username

    TempUser.create(unverified_email, request.password, "10.10.10.10", extra=extra)

    unverified_email.send(view_context.raw_request, signup=True)
    return {"result": "success"}


@accounts_root_views.get(url_path=r"^myprofile")
def my_profile(user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> HttpResponse:
    if user is None:
        return global_renderer.render_error_message(view_context.raw_request, "Please login",
                                                    "You need to login to continue. You can login from the navbar (upper right corner)")
    if user.username:
        return HttpResponseRedirect("/user/" + user.username)
    return global_renderer.render_error_message(view_context.raw_request, "No username set",
                                                "You need to <a href='/accounts/settings'>set your username</a> to access your public profile.")


class RemoveSocialAccountRequest(BaseRequest):
    social_account_id: int


@accounts_views.post()
def remove_social_account(request: RemoveSocialAccountRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    from establishment.socialaccount.models import SocialAccount

    social_account = SocialAccount.objects.filter(id=request.social_account_id).first()
    if social_account is None:
        raise InvalidSocialAccount
    if social_account.user_id != user.id:
        raise InvalidSocialAccountRemoval
    social_account.delete()

    return {
        "success": True,
        "user": UserSummary(user),
    }


class LoginRequest(BaseRequest):
    password: str
    email: Optional[str] = None
    username: Optional[str] = None
    remember: bool = False


@accounts_views.post(url_path="login")
def user_login_view(request: LoginRequest, user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> dict[str, Any]:
    if user is not None:
        raise AlreadyLoggedIn

    if request.email is not None:
        logged_in_user = django_authenticate(email=request.email, password=request.password)
    else:
        logged_in_user = django_authenticate(username=request.username, password=request.password)
    if logged_in_user is None:
        raise InvalidLoginCredentials

    raw_request = view_context.raw_request
    perform_login(raw_request, logged_in_user)
    # An expiry of 0 ends the session when the browser closes
    raw_request.session.set_expiry(settings.SESSION_COOKIE_AGE if request.remember else 0)
    return {"success": True}


@accounts_views.post()
def logout(user: AbstractStreamObjectUser, view_context: BaseViewContext) -> dict[str, Any]:
    django_logout(view_context.raw_request)
    return {"success": True}


class EmailAddressRequest(BaseRequest):
    email: str


@accounts_views.post()
def email_address_add(request: EmailAddressRequest, user: AbstractStreamObjectUser, view_context: BaseViewContext) -> dict[str, Any]:
    try:
        unverified_email = UnverifiedEmail.create(email=request.email, user=user)
        if unverified_email is None:
            raise InvalidEmailAddress
        unverified_email.send(view_context.raw_request)
    except Exception:
        raise InvalidEmailAddress

    return {
        "success": True,
        "user": UserSummary(user),
    }


@accounts_views.post()
def email_address_remove(request: EmailAddressRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    email_address = EmailAddress.objects.filter(user_id=user.id, email=request.email).first()
    if email_address is not None:
        if email_address.primary:
            raise PrimaryEmailRemoval
        email_address.delete()
    else:
        unverified_email = UnverifiedEmail.objects.filter(user_id=user.id, email=request.email).first()
        if unverified_email is None:
            # TODO: log this
            raise InvalidEmailAddress
        unverified_email.delete()

    return {
        "success": True,
        "user": UserSummary(user),
    }


@accounts_views.post()
def email_address_make_primary(request: EmailAddressRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    email_address = EmailAddress.objects.filter(user_id=user.id, email=request.email).first()
    if email_address is None:
        raise InvalidEmailAddress
    email_address.set_as_primary()

    return {
        "success": True,
        "user": UserSummary(user),
    }


# Resends the confirmation email of an address the user added
@accounts_views.post()
def email_address_verification_send(request: EmailAddressRequest, user: AbstractStreamObjectUser, view_context: BaseViewContext) -> dict[str, Any]:
    unverified_email = UnverifiedEmail.objects.filter(user_id=user.id, email=request.email).first()
    if unverified_email is None:
        raise InvalidEmailAddress
    unverified_email.send(view_context.raw_request)

    return {"success": True}


@accounts_views.single_page_app(url_path=r"^email_unsubscribe/(?P<key>\w+)/$")
def email_unsubscribe(key: URLArg) -> dict[str, Any]:
    unsubscribed_user = get_user_model().objects.filter(email_unsubscribe_key=key).first()
    if unsubscribed_user is None:
        return {}

    unsubscribed_user.receives_email_announcements = False
    unsubscribed_user.save()

    return {"unsubscribeSuccess": True}


@accounts_views.single_page_app(url_path=r"^email_address_verify/(?P<key>\w+)/$")
def email_address_verify(key: URLArg, view_context: BaseViewContext) -> dict[str, Any]:
    # TODO: we'll want a nice way of protecting against spammers hitting us with heavy requests (keys over 1MB for instance)
    unverified_email = UnverifiedEmail.objects.filter(key=key).first()
    if unverified_email is None or unverified_email.key_expired():
        return {}

    if unverified_email.user is None:
        # A signup: the account is only created once its email is confirmed
        create_user_args: list[Any] = []
        update_dict: dict[str, Any] = {}
        temp_user = TempUser.objects.filter(email=unverified_email).first()
        if temp_user is not None:
            update_dict = temp_user.extra or {}
            update_dict["password"] = temp_user.password
            if "username" in update_dict and get_user_model()().has_field("username"):
                available_username = get_user_model().get_available_username(update_dict["username"])
                create_user_args = [None, available_username]
                update_dict["username"] = available_username
        new_user = get_user_model().objects.create_user(unverified_email.email, *create_user_args)
        new_user.edit_from_dict(update_dict)
        if "password" not in update_dict:
            new_user.set_unusable_password()
        unverified_email.user = new_user

    email_address = unverified_email.convert()

    login(view_context.raw_request, email_address.user)

    return {"confirmSuccess": True}


class PasswordChangeRequest(BaseRequest):
    new_password: str
    old_password: Optional[str] = None


@accounts_views.post()
def password_change(request: PasswordChangeRequest, user: AbstractStreamObjectUser, view_context: BaseViewContext) -> dict[str, Any]:
    # Only an account that never had a password, made through a social login, may skip the old one
    if request.old_password is None:
        if user.has_usable_password():
            raise MissingPassword
    elif not user.check_password(request.old_password):
        raise WrongPassword

    user.set_password(request.new_password)
    user.save()

    keep_session_after_password_change(view_context.raw_request, user)

    return {
        "success": True,
        "user": UserSummary(user),
    }


class PasswordResetRequest(BaseRequest):
    email: str


@accounts_views.post()
def password_reset_request(request: PasswordResetRequest, user: Optional[AbstractStreamObjectUser], view_context: BaseViewContext) -> dict[str, Any]:
    reset_email_address = request.email

    reset_password_throttler = UserActionThrottler(user or 0, "reset-password-" + reset_email_address, 60 * 60, 2)
    if not reset_password_throttler.increm():
        raise TooManyPasswordResets

    logger.info("Requesting a password reset for email " + str(reset_email_address))

    reset_user = get_user_model().objects.filter(email__iexact=reset_email_address).first()
    if reset_user is None:
        raise InvalidEmailAddress

    # TODO: A logged in user can only request a password reset for themselves

    reset_token = password_reset_token_generator.make_token(reset_user)

    raw_request = view_context.raw_request
    # Every site mounts the accounts routes under accounts/
    url = raw_request.build_absolute_uri(f"/accounts/password_reset/{int_to_base36(reset_user.id)}-{reset_token}/")
    context = {
        "password_reset_url": url,
        "current_site": Site.objects.get_current(request=raw_request),
    }

    send_template_mail("account/email/password_reset_key", reset_email_address, context)

    return {"success": True}


@accounts_views.single_page_app(url_path=r"^password_reset/(?P<user_base36>[0-9A-Za-z]+)-(?P<reset_token>.+)/$")
def password_reset_from_token(user_base36: URLArg, reset_token: URLArg, view_context: BaseViewContext) -> dict[str, Any]:
    reset_user = get_user_model().objects.filter(id=base36_to_int(user_base36)).first()
    if reset_user is None:
        raise NotFound

    if not password_reset_token_generator.check_token(reset_user, reset_token):
        logger.warning("Invalid password reset token to user " + str(reset_user))
        raise InvalidPasswordResetToken

    reset_user.set_unusable_password()
    reset_user.save()
    login(view_context.raw_request, reset_user)
    return {}


class PublicUserProfilesRequest(BaseRequest):
    username_prefix: Optional[str] = None
    ids: list[int] = []


@accounts_views.get()
def public_user_profiles(request: PublicUserProfilesRequest) -> State:
    users: Iterable[AbstractStreamObjectUser]
    if request.username_prefix is not None:
        precise_user = get_user_model().objects.filter(username__iexact=request.username_prefix)
        prefix_users = get_user_model().objects.filter(username__istartswith=request.username_prefix)[:10]
        users = list(precise_user) + list(prefix_users)
    else:
        if len(request.ids) > 512:
            # TODO: log this, may need to ban someone
            raise TooManyProfilesRequested
        users = get_user_model().objects.filter(id__in=request.ids)

    return State(get_public_user_class().wrap_user_list(users))


@accounts_views.get()
def get_user_notifications(user: AbstractStreamObjectUser) -> State:
    user_summary = UserSummary(user)
    notifications = UserNotification.objects.filter(user_id=user.id).order_by("-id")[0:100]
    return State(user_summary, notifications)


@accounts_views.post()
def set_user_notifications_read(user: AbstractStreamObjectUser) -> dict[str, Any]:
    # TODO: if any notification Ids are given, mark them all as read
    last_user_notification = UserNotification.objects.filter(user_id=user.id).order_by("-id").first()
    if last_user_notification:
        user.get_custom_settings().set_last_read_notification(last_user_notification)
    return {"success": True}


class ChangeUserGroupRequest(BaseRequest):
    group_id: int
    user_id: int
    action: str


@accounts_views.post()
def change_user_group(request: ChangeUserGroupRequest, user: AbstractStreamObjectUser) -> State:
    group = UserGroup.get_group_by_id(request.group_id)
    if not user.is_superuser and group.owner_id != user.id:
        raise PermissionDenied

    state = State()
    if request.action == "remove":
        UserGroupMember.objects.filter(user_id=request.user_id, group_id=group.id).delete()
    elif request.action == "add":
        group_member, created = UserGroupMember.objects.get_or_create(user_id=request.user_id, group_id=group.id)
        state.add(group_member)
    return state
