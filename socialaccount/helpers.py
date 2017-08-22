from django.contrib.auth import logout, get_user_model
from django.http import HttpResponseBadRequest
from django.http import HttpResponseRedirect

from establishment.accounts.adapter import perform_login
from establishment.accounts.models import EmailAddress

from .errors import SocialAccountError
from .providers.base import AuthProcess


def complete_social_login(request, social_login):
    social_login.lookup()
    process = social_login.state.get("process", AuthProcess.LOGIN)
    if process == AuthProcess.LOGIN:
        return _complete_social_login(request, social_login)
    elif process == AuthProcess.CONNECT:
        return _add_social_account(request, social_login)
    else:
        raise SocialAccountError.GENERIC_INVALID_PROCESS


# TODO: this should probably be a method in social_login, connect_to_account!
def _add_social_account(request, social_login):
    if request.user.is_anonymous:
        # This should not happen.
        return HttpResponseBadRequest()
    if social_login.is_temporary():
        # New account, let's connect
        social_login.connect(request.user)
    next_url = social_login.get_redirect_url(request)
    # TODO(@gem): return connect success
    return HttpResponseRedirect(next_url)


def _complete_social_login(request, social_login):
    if request.user.is_authenticated:
        logout(request)

    if not social_login.email_addresses:
        raise SocialAccountError.SOCIAL_ACCOUNT_NO_EMAIL

    # Check for an existing user with same email as social email and connect if found
    for email in social_login.email_addresses:
        if social_login.is_temporary():
            user = None

            # First try to see if there's a matching EmailAddress entry
            # After that check if there are email addresses with that email
            # The later case can only happen when user accounts were created from the django createsuperuser command
            try:
                user = EmailAddress.objects.get(email=email.email, user__isnull=False).user
            except EmailAddress.DoesNotExist:
                pass

            try:
                if user is None:
                    user = get_user_model().objects.get(email=email.email)
            except Exception:
                pass

            if user:
                social_login.connect(user)

    # If we couldn't find an email address matching the social_login ones, we need to create a new user
    if social_login.is_temporary():
        user = social_login.user
        user.username = None
        user.set_unusable_password()
        social_login.save()

    return perform_login(request, social_login.user) or HttpResponseRedirect(social_login.get_redirect_url(request))
