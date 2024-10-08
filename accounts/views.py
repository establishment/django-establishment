import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate as django_authenticate, get_user_model
from django.contrib.auth import logout as django_logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator as password_reset_token_generator
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.http import base36_to_int, int_to_base36

from establishment.utils.errors_deprecated import BaseError
from establishment.webapp.base_views import login_required, login_required_ajax, ajax_required, global_renderer
from establishment.webapp.base_views import single_page_app
from establishment.utils.state import State
from ..utils.convert import int_list
from establishment.webapp.throttle import ActionThrottler
from .adapter import login, perform_login
from .errors import AccountsError
from .models import EmailAddress, UnverifiedEmail, TempUser, UserSummary, UserGroup, UserGroupMember
from .recaptcha_client import test_recaptcha
from .utils import send_template_mail, get_user_manager, get_public_user_class

logger = logging.getLogger("django.request")


@ajax_required
def user_signup_request(request):
    if request.user.is_authenticated:
        return AccountsError.ALREADY_LOGGED_IN

    if not test_recaptcha(request):
        # TODO: log this error
        return AccountsError.INVALID_CAPTCHA

    # TODO: this should be moved to settings
    MAX_SIGNUPS_PER_IP_PER_DAY = 300

    if not ActionThrottler("user_signup_" + request.visitor.ip(), 24 * 3600, MAX_SIGNUPS_PER_IP_PER_DAY).increm():
        return AccountsError.TOO_MANY_SIGN_UPS

    email = request.POST["email"]
    if EmailAddress.objects.filter(email__iexact=email).exists():
        return AccountsError.EMAIL_UNAVAILABLE

    password = request.POST.get("password", "")

    unverified_email = UnverifiedEmail.create(email=email)

    extra = {}
    if "countryId" in request.POST and request.POST["countryId"] != -1:
        from establishment.localization.models import Country
        try:
            Country.objects.get(id=int(request.POST["countryId"]))
            extra["countryId"] = request.POST["countryId"]
        except ObjectDoesNotExist:
            pass
    if "username" in request.POST and request.POST["username"] != "":
        user = get_user_model()(email=email, password=password)
        if user.has_field("username"):
            user.username = request.POST["username"]
            try:
                get_user_manager().get(username=user.username)
                return AccountsError.USERNAME_UNAVAILABLE
            except ObjectDoesNotExist:
                pass
            try:
                user.full_clean()
                extra["username"] = request.POST["username"]
            except ValidationError:
                return AccountsError.INVALID_USERNAME
    TempUser.create(unverified_email, password, "10.10.10.10", extra=extra)

    unverified_email.send(request, signup=True)
    return {"result": "success"}


@login_required
@single_page_app
def account_settings(request):
    return State(UserSummary(request.user))


@login_required
def my_profile(request):
    if request.user.username:
        return HttpResponseRedirect("/user/" + request.user.username)
    return global_renderer.render_error_message(request, "No username set",
                                  "You need to <a href='/accounts/settings'>set your username</a> to access your public profile.")


@single_page_app
def public_user_profile(request, profile_user):
    state = State()
    user_summary = get_public_user_class()(profile_user)
    state.add(user_summary)
    return state.to_response({
        "userId": profile_user.id,
    })


def public_username_profile(request, username):
    try:
        profile_user = get_user_manager().get(username__iexact=username)
    except ObjectDoesNotExist:
        return global_renderer.render_error_message(request, "Invalid user", "The user " + username + " doesn't exist.")
    return public_user_profile(request, profile_user)


def public_user_id_profile(request, user_id):
    try:
        profile_user = get_user_manager().get(id=user_id)
    except ObjectDoesNotExist:
        return global_renderer.render_error_message(request, "Invalid user", "The user with id " + user_id + " doesn't exist.")
    return public_user_profile(request, profile_user)


@login_required_ajax
def edit_profile(request):
    save_user = False
    if "firstName" in request.POST and request.user.first_name != request.POST["firstName"]:
        request.user.first_name = request.POST["firstName"]
        save_user = True

    if "lastName" in request.POST and request.user.last_name != request.POST["lastName"]:
        request.user.last_name = request.POST["lastName"]
        save_user = True

    if "userName" in request.POST and request.user.username != request.POST["userName"]:
        request.user.username = request.POST["userName"]
        save_user = True

    if "displayName" in request.POST and request.user.display_name != request.POST["displayName"]:
        request.user.display_name = json.loads(request.POST["displayName"])
        save_user = True

    if "receivesEmailAnnouncements" in request.POST:
        receives_email_announcements = json.loads(request.POST["receivesEmailAnnouncements"])
        if request.user.receives_email_announcements != receives_email_announcements:
            request.user.receives_email_announcements = receives_email_announcements
            save_user = True

    if "customSettingsKey" in request.POST:
        # TODO: add ability to save multiple ones in the same request
        request.user.set_custom_setting(request.POST["customSettingsKey"], request.POST["customSettingsValue"])

    if "localeLanguageId" in request.POST:
        request.user.locale_language_id = int(request.POST["localeLanguageId"])
        save_user = True

    if save_user:
        try:
            request.user.full_clean()
            request.user.save()
        except ValidationError as e:
            return {
                "error": e.message_dict
            }
        request.user.publish_event("profileChanged", request.user)

    return State([UserSummary(request.user)]).to_response(extra={"success": True})


@login_required_ajax
def remove_social_account(request):
    social_account_id = int(request.POST["socialAccountId"])

    from establishment.socialaccount.models import SocialAccount
    try:
        social_account = SocialAccount.objects.get(id=social_account_id)
        if social_account.user_id == request.user.id:
            social_account.delete()
        else:
            return AccountsError.INVALID_SOCIAL_ACCOUNT_REMOVAL
    except SocialAccount.DoesNotExist:
        return AccountsError.INVALID_SOCIAL_ACCOUNT

    return {
        "success": True,
        "user": UserSummary(request.user)
    }


@ajax_required
def user_login_view(request):
    if request.user.is_authenticated:
        return AccountsError.ALREADY_LOGGED_IN

    credentials = {
        "password": request.POST["password"]
    }

    if "email" in request.POST:
        credentials["email"] = request.POST["email"]
    else:
        credentials["username"] = request.POST["username"]

    user = django_authenticate(**credentials)

    if user:
        perform_login(request, user)
        if request.POST.get("remember", False):
            request.session.set_expiry(settings.SESSION_COOKIE_AGE)
        else:
            request.session.set_expiry(0)
    else:
        return AccountsError.INVALID_LOGIN_CREDENTIALS
    return {"success": True}


@login_required
def user_logout_view(request):
    django_logout(request)
    return {"success": True}


@login_required_ajax
def email_address_add(request):
    try:
        unverified_email = UnverifiedEmail.create(email=request.POST["email"], user=request.user)
        unverified_email.send(request)
    except:
        return AccountsError.INVALID_EMAIL_ADDRESS

    return {
        "success": True,
        "user": UserSummary(request.user)
    }


@login_required_ajax
def email_address_remove(request):
    email = request.POST["email"]

    try:
        email_address = EmailAddress.objects.get(user=request.user, email=email)
        if email_address.primary:
            return AccountsError.PRIMARY_EMAIL_REMOVAL
        else:
            email_address.delete()
    except EmailAddress.DoesNotExist:
        try:
            unverified_email = UnverifiedEmail.objects.get(user=request.user, email=email)
            unverified_email.delete()
        except UnverifiedEmail.DoesNotExist:
            # TODO: log this
            return AccountsError.INVALID_EMAIL_ADDRESS

    return {
        "success": True,
        "user": UserSummary(request.user)
    }


@login_required_ajax
def email_address_make_primary(request):
    email = request.POST["email"]
    try:
        email_address = EmailAddress.objects.get(user=request.user, email=email)
        email_address.set_as_primary()
    except EmailAddress.DoesNotExist:
        return AccountsError.INVALID_EMAIL_ADDRESS

    return {
        "success": True,
        "user": UserSummary(request.user)
    }


@ajax_required
def email_address_verification_send(request):
    """
    User requests that a confirmation email is sent to his email address
    """
    email = request.POST["email"]

    try:
        unverified_email = UnverifiedEmail.objects.get(user=request.user, email=email)
        unverified_email.send(request)
    except UnverifiedEmail.DoesNotExist:
        return AccountsError.INVALID_EMAIL_ADDRESS

    return {"success": True}


@single_page_app
def email_unsubscribe(request, key):
    try:
        user = get_user_manager().get(email_unsubscribe_key=key)
    except:
        return {}

    user.receives_email_announcements = False
    user.save()

    return {"unsubscribeSuccess": True}


@single_page_app
def email_address_verify(request, key):
    # TODO: we'll want a nice way of protecting against spammers hitting us with heavy requests (keys over 1MB for instance)
    try:
        unverified_email = UnverifiedEmail.objects.get(key=key)
        if unverified_email.key_expired():
            return {}
    except ObjectDoesNotExist:
        return {}

    if unverified_email.user is None:
        # create a new user
        try:
            temp_user = TempUser.objects.get(email=unverified_email)
            update_dict = temp_user.extra or {}
            extra = []
            update_dict["password"] = temp_user.password
            if "username" in temp_user.extra and (get_user_model()()).has_field("username"):
                available_username = get_user_model().get_available_username(temp_user.extra["username"])
                extra = [None, available_username]
                update_dict["username"] = available_username
        except ObjectDoesNotExist:
            extra = []
            update_dict = {}
        user = get_user_manager().create_user(unverified_email.email, *extra)
        user.edit_from_dict(update_dict)
        if "password" not in update_dict:
            user.set_unusable_password()
        unverified_email.user = user

    email_address = unverified_email.convert()
    if email_address is None:
        return {}

    login(request, email_address.user)

    return {"confirmSuccess": True}


@login_required_ajax
def user_password_change(request):
    old_password = request.POST.get("oldPassword", None)
    new_password = request.POST["newPassword"]

    # You're allowed to change the password without sending the old one only when you're missing one (You've only logged in from social accounts)
    if old_password is None:
        # Check here that the account has never before set a password
        if request.user.has_usable_password():
            return AccountsError.MISSING_PASSWORD
    else:
        # Check the current password for the user
        if not request.user.check_password(old_password):
            return AccountsError.WRONG_PASSWORD

    # Actually change the password
    request.user.set_password(new_password)
    request.user.save()

    # Logout the user everywhere else (invalidate all sessions)
    # Log him in here in a new session
    update_session_auth_hash(request, request.user)

    return {
        "success": True,
        "user": UserSummary(request.user)
    }


@single_page_app
def user_password_reset_request(request):
    reset_email_address = request.POST["email"]

    from establishment.webapp.throttle import UserActionThrottler

    reset_password_throttler = UserActionThrottler(request.user or 0, "reset-password-" + reset_email_address, 60 * 60, 2)
    if not reset_password_throttler.increm():
        return AccountsError.TOO_MANY_PASSWORD_RESETS

    logger.info("Requesting a password reset for email " + str(reset_email_address))

    try:
        user = get_user_manager().get(email__iexact=reset_email_address)
    except:
        return AccountsError.INVALID_EMAIL_ADDRESS

    #TODO: A logged in user can only request a password reset for themselves

    reset_token = password_reset_token_generator.make_token(user)

    # Send the password reset email

    # TODO: is this reverse the best way of doing this?
    path = reverse("user_password_reset_from_token", kwargs=dict(user_base36=int_to_base36(user.id), reset_token=reset_token))
    url = request.build_absolute_uri(path)

    from django.contrib.sites.models import Site
    context = {
        "password_reset_url": url,
        "current_site": Site.objects.get_current(request=request)
    }

    send_template_mail("account/email/password_reset_key", reset_email_address, context)

    return {"success": True}


@single_page_app
def user_password_reset_from_token(request, user_base36, reset_token):
    user_id = base36_to_int(user_base36)
    reset_user = get_user_manager().get(id=user_id)

    token_valid = password_reset_token_generator.check_token(reset_user, reset_token)

    if not token_valid:
        logger.warn("Invalid password reset token to user " + str(reset_user))
        return AccountsError.INVALID_PASSWORD_RESET_TOKEN

    reset_user.set_unusable_password()
    reset_user.save()
    # Logout the user everywhere else (invalidate all sessions)
    # Log him in here in a new session
    # update_session_auth_hash(request, request.user)
    login(request, reset_user)
    return {}


@ajax_required
def public_user_profiles(request):
    if "usernamePrefix" in request.GET:
        username_prefix = request.GET["usernamePrefix"]
        precise_user = get_user_manager().filter(username__iexact=username_prefix)
        prefix_users = get_user_manager().filter(username__istartswith=username_prefix)[:10]
        users = list(precise_user) + list(prefix_users)
    else:
        user_ids = int_list(request.GET.getlist("ids[]"))
        if len(user_ids) > 512:
            # TODO: log this, may need to ban someone
            return AccountsError.TOO_MANY_PROFILES_REQUESTED
        users = get_user_manager().filter(id__in=user_ids)

    return State(get_public_user_class().wrap_user_list(users))


@login_required_ajax
def get_user_notifications(request):
    user_summary = UserSummary(request.user)
    notifications = request.user.notifications.all().order_by("-id")[0:100]
    return State(user_summary, notifications)


@login_required_ajax
def set_user_notifications_read(request):
    # TODO: if any notification Ids are given, mark them all as read
    # request.user.notifications.all().update(read=True)
    last_user_notification = request.user.notifications.all().order_by("-id").first()
    if last_user_notification:
        request.user.get_custom_settings().set_last_read_notification(last_user_notification)
    return {"success": True}


@ajax_required
def change_user_group(request):
    group_id = int(request.POST["groupId"])
    group = UserGroup.get_group_by_id(group_id)
    if not request.user.is_superuser and group.owner_id != request.user.id:
        return BaseError.NOT_ALLOWED

    state = State()
    user_id = int(request.POST["userId"])
    action = request.POST["action"]
    if action == "remove":
        UserGroupMember.objects.filter(user_id=user_id, group_id=group_id).delete()
    elif action == "add":
        group_member, created = UserGroupMember.objects.get_or_create(user_id=user_id, group_id=group_id)
        state.add(group_member)
    return state
