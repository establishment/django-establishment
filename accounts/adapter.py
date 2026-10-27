def login(request, user):
    from django.contrib.auth import login
    if not hasattr(user, "backend"):
        user.backend = "establishment.accounts.auth_backends.AuthenticationBackend"
    login(request, user)


def perform_login(request, user):
    if not user.is_active:
        # TODO: raise a custom ErrorMessage here
        raise RuntimeError("Inactive account")
    login(request, user)


# Every other session of the user is invalidated, the one making the change stays logged in
def keep_session_after_password_change(request, user):
    from django.contrib.auth import update_session_auth_hash
    update_session_auth_hash(request, user)
