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
