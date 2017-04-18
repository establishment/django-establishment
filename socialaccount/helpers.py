from django.contrib.auth import logout
from django.http import HttpResponseBadRequest
from django.http import HttpResponseRedirect

from establishment.accounts.adapter import perform_login
from establishment.accounts.models import EmailAddress
from .providers.base import AuthProcess


def complete_social_login(request, social_login):
    social_login.lookup()
    process = social_login.state.get("process", AuthProcess.LOGIN)
    if process == AuthProcess.LOGIN:
        return _complete_social_login(request, social_login)
    elif process == AuthProcess.CONNECT:
        return _add_social_account(request, social_login)
    else:
        raise RuntimeError("Invalid login process")


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
        # TODO: this should be handled by a custom exception type
        raise RuntimeError("We need an email address to login to social")

    # Check for an existing user with same email as social email and connect if found
    for email in social_login.email_addresses:
        if social_login.is_temporary():
            try:
                user = EmailAddress.objects.get(email=email.email, user__isnull=False).user
                social_login.connect(user)
            except EmailAddress.DoesNotExist:
                pass

    # If we couldn't find an email address matching the social_login ones, we need to create a new user
    if social_login.is_temporary():
        user = social_login.user
        user.username = None
        user.set_unusable_password()
        social_login.save()

    return perform_login(request, social_login.user) or HttpResponseRedirect(social_login.get_redirect_url(request))
