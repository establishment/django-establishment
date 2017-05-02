import json
import logging

from django.conf import settings
from django.contrib.auth import authenticate as django_authenticate
from django.contrib.auth import logout as django_logout
from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator as password_reset_token_generator
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils.http import base36_to_int, int_to_base36
from establishment.funnel.base_views import JSONResponse, JSONErrorResponse, login_required, login_required_ajax, ajax_required, global_renderer
from establishment.funnel.throttle import ActionThrottler

from establishment.funnel.utils import GlobalObjectCache, int_list
from establishment.funnel.base_views import single_page_app
from .adapter import login, perform_login
from .models import EmailAddress, UnverifiedEmail, UserSummary, PublicUserSummary
from .recaptcha_client import test_recaptcha
from .utils import send_template_mail, get_user_manager

logger = logging.getLogger("django.request")


@ajax_required
def user_signup_request(request):
    if request.user.is_authenticated:
        return JSONErrorResponse("You're already logged in.")

    if not test_recaptcha(request):
        # TODO: log this error
        return JSONErrorResponse("Invalid recaptch!")

    # TODO: this should be moved to settings
    MAX_SIGNUPS_PER_IP_PER_DAY = 300

    if not ActionThrottler("user_signup_" + request.visitor.ip(), 24 * 3600, MAX_SIGNUPS_PER_IP_PER_DAY).increm():
        return JSONErrorResponse("Too many users created from your IP, daily limit of " + str(MAX_SIGNUPS_PER_IP_PER_DAY))

    email = request.POST["email"]
    if EmailAddress.objects.filter(email__iexact=email).exists():
        return JSONErrorResponse("Email address is already in use.")

    try:
        unverified_email = UnverifiedEmail.create(email=email)
        unverified_email.send(request, signup=True)
    except:
        return JSONErrorResponse("Invalid email address.")
    return JSONResponse({"result": "success"})


@login_required
def account_settings(request):
    state = GlobalObjectCache()
    state.add(UserSummary(request.user))
    return global_renderer.render_ui_widget(request, "UserSettingsPanel", state, page_title="Account settings")


@login_required
def my_profile(request):
    if request.user.username:
        return HttpResponseRedirect("/user/" + request.user.username)
    return global_renderer.render_error_message(request, "No username set",
                                  "You need to <a href='/accounts/settings'>set your username</a> to access your public profile.")


def public_user_profile(request, profile_user):
    state = GlobalObjectCache()
    user_summary = PublicUserSummary(profile_user)
    state.add(user_summary)

    widget_options = {
        "userId": profile_user.id,
    }
    return global_renderer.render_ui_widget(request, "UserProfilePanel", state, page_title="User Profile", widget_options=widget_options)


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
            return JSONErrorResponse(e.message_dict)


        # user_event = {
        #     "type": "profileChanged",
        #     "objectType": "user",
        #     "objectId": request.user.id,
        #     "data": request.user
        # }
        # RedisStreamPublisher.publish_to_stream("user-" + str(request.user.id) + "-events", user_event)
        request.user.publish_event("profileChanged", request.user)

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


@login_required_ajax
def remove_social_account(request):
    social_account_id = int(request.POST["socialAccountId"])

    from establishment.socialaccount.models import SocialAccount
    try:
        social_account = SocialAccount.objects.get(id=social_account_id)
        if social_account.user_id == request.user.id:
            social_account.delete()
        else:
            return JSONErrorResponse("Can't remove social account for other user")
    except SocialAccount.DoesNotExist:
        return JSONErrorResponse("Social account doesn't exist")

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


@ajax_required
def user_login_view(request):
    if request.user.is_authenticated:
        return JSONErrorResponse("You're already authenticated!")

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
        return JSONErrorResponse("The e-mail address and/or password you specified are not correct.")
    return JSONResponse({"success": True})


@login_required
def user_logout_view(request):
    django_logout(request)
    return JSONResponse({"success": True})


@login_required_ajax
def email_address_add(request):
    try:
        unverified_email = UnverifiedEmail.create(email=request.POST["email"], user=request.user)
        unverified_email.send(request)
    except:
        return JSONErrorResponse("Can't add this email address, either invalid or is already used.")

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


@login_required_ajax
def email_address_remove(request):
    email = request.POST["email"]

    try:
        email_address = EmailAddress.objects.get(user=request.user, email=email)
        if email_address.primary:
            return JSONErrorResponse("Email address is primary, can't remove")
        else:
            email_address.delete()
    except EmailAddress.DoesNotExist:
        try:
            unverified_email = UnverifiedEmail.objects.get(user=request.user, email=email)
            unverified_email.delete()
        except UnverifiedEmail.DoesNotExist:
            # TODO: log this
            return JSONErrorResponse("Email address does not exist")

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


@login_required_ajax
def email_address_make_primary(request):
    email = request.POST["email"]
    try:
        email_address = EmailAddress.objects.get(user=request.user, email=email)
        email_address.set_as_primary()
    except EmailAddress.DoesNotExist:
        return JSONErrorResponse("Email does not exist.")

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


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
        return JSONErrorResponse("Email address does not exist")

    return JSONResponse({"success": True})


def email_address_verify(request, key):
    # TODO: we'll want a nice way of protecting against spammers hitting us with heavy requests (keys over 1MB for instance)
    try:
        unverified_email = UnverifiedEmail.objects.get(key=key)
    except:
        return global_renderer.render_ui_widget(request, "EmailConfirmed", page_title="Confirm E-mail Address")

    if unverified_email.user is None:
        # create a new user
        user = get_user_manager().create_user(unverified_email.email)
        user.set_unusable_password()
        unverified_email.user = user
        user_created = True
    else:
        user_created = False

    email_address = unverified_email.verify()
    if email_address is None:
        return global_renderer.render_ui_widget(request, "EmailConfirmed", page_title="Confirm E-mail Address")

    login(request, email_address.user)

    return global_renderer.render_ui_widget(request, "EmailConfirmed", page_title="Confirm E-mail Address",
                            widget_options={"confirmSuccess": True})


def email_unsubscribe(request, key):
    try:
        user = get_user_manager().get(email_unsubscribe_key=key)
    except:
        return global_renderer.render_ui_widget(request, "EmailUnsubscribe", page_title="Unsubscribe E-mail Address")

    user.receives_email_announcements = False
    user.save()

    return global_renderer.render_ui_widget(request, "EmailUnsubscribe", page_title="Unsubscribe E-mail Address",
                            widget_options={"unsubscribeSuccess": True})


@single_page_app
def email_address_verify_single_page(request, key):
    # TODO: we'll want a nice way of protecting against spammers hitting us with heavy requests (keys over 1MB for instance)
    try:
        unverified_email = UnverifiedEmail.objects.get(key=key)
    except:
        return JSONResponse({})

    if unverified_email.user is None:
        # create a new user
        user = get_user_manager().create_user(unverified_email.email)
        user.set_unusable_password()
        unverified_email.user = user
        user_created = True
    else:
        user_created = False

    email_address = unverified_email.verify()
    if email_address is None:
        return JSONResponse({})

    login(request, email_address.user)

    return JSONResponse({"confirmSuccess": True})


@single_page_app
def email_unsubscribe_single_page(request, key):
    try:
        user = get_user_manager().get(email_unsubscribe_key=key)
    except:
        return JSONResponse({})

    user.receives_email_announcements = False
    user.save()

    return JSONResponse({"unsubscribeSuccess": True})


@login_required_ajax
def user_password_change(request):
    old_password = request.POST.get("oldPassword", None)
    new_password = request.POST["newPassword"]

    # You're allowed to change the password without sending the old one only when you're missing one (You've only logged in from social accounts)
    if old_password is None:
        # Check here that the account has never before set a password
        if request.user.has_usable_password():
            return JSONErrorResponse("Missing password field.")
    else:
        # Check the current password for the user
        if not request.user.check_password(old_password):
            return JSONErrorResponse("Wrong password.")

    # Actually change the password
    request.user.set_password(new_password)
    request.user.save()

    # Logout the user everywhere else (invalidate all sessions)
    # Log him in here in a new session
    update_session_auth_hash(request, request.user)

    return JSONResponse({
        "success": True,
        "user": UserSummary(request.user)
    })


def user_password_reset_request(request):
    if not request.is_ajax():
        return global_renderer.render_ui_widget(request, "PasswordReset", page_title="Password reset")

    reset_email_address = request.POST["email"]

    from establishment.funnel.throttle import UserActionThrottler

    reset_password_throttler = UserActionThrottler(request.user or 0, "reset-password-" + reset_email_address, 60 * 60, 2)
    if not reset_password_throttler.increm():
        return JSONErrorResponse("You may request another password reset later.")

    logger.info("Requesting a password reset for email " + str(reset_email_address))

    try:
        user = get_user_manager().get(email__iexact=reset_email_address)
    except:
        return JSONErrorResponse("Can't find a user with this email address")

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

    return JSONResponse({"success": True})


def user_password_reset_from_token(request, user_base36, reset_token):
    context = {}

    user_id = base36_to_int(user_base36)
    reset_user = get_user_manager().get(id=user_id)

    token_valid = password_reset_token_generator.check_token(reset_user, reset_token)

    if not token_valid:
        logger.warn("Invalid password reset token to user " + str(reset_user))

        if not request.is_ajax():
            return global_renderer.render_ui_widget(request, "PasswordResetFromKey", page_title="Set password",
                                    widget_options={"tokenFail": True})

        # If it's an ajax response (or whatever), just make sure to not continue
        return JSONErrorResponse("Invalid password token")

    reset_user.set_unusable_password()
    reset_user.save()
    # Logout the user everywhere else (invalidate all sessions)
    # Log him in here in a new session
    # update_session_auth_hash(request, request.user)
    login(request, reset_user)
    # TODO(@gem): redirect to profile/security tab
    return global_renderer.render_ui_widget(request, "PasswordResetFromKey", page_title="Set password")


@ajax_required
def public_user_profiles(request):
    state = GlobalObjectCache()
    if "usernamePrefix" in request.GET:
        username_prefix = request.GET["usernamePrefix"]
        precise_user = get_user_manager().filter(username__iexact=username_prefix)
        prefix_users = get_user_manager().filter(username__istartswith=username_prefix)[:10]
        users = list(precise_user) + list(prefix_users)
    else:
        user_ids = int_list(request.GET.getlist("ids[]"))
        if len(user_ids) > 1024:
            # TODO: log this, may need to ban that asshole
            return JSONErrorResponse("Requesting too many users")
        users = get_user_manager().filter(id__in=user_ids)

    for user in users:
        state.add(PublicUserSummary(user))

    return state.to_response()


@login_required_ajax
def get_user_notifications(request):
    user_notifications = request.user.notifications.all()
    state = GlobalObjectCache()
    state.add_all(user_notifications)
    state.add(UserSummary(request.user))
    return state.to_response()


@login_required_ajax
def set_user_notifications_read(request):
    # TODO: if any notification Ids are given, mark them all as read
    # request.user.notifications.all().update(read=True)
    last_user_notification = request.user.notifications.all().order_by("-id").first()
    if last_user_notification:
        request.user.get_custom_settings(True).set_last_read_notification(last_user_notification)
    return JSONResponse({"success": True})
