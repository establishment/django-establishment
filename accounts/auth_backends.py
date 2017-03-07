from django.contrib.auth import get_user_model
from django.contrib.auth.backends import ModelBackend


class AuthenticationBackend(ModelBackend):

    def authenticate(self, **credentials):
        from .models import EmailAddress

        email = credentials.get("email")
        username = credentials.get("username")
        password = credentials["password"]

        if email:
            try:
                email = EmailAddress.objects.get(email=email)
                if email.user.check_password(password):
                    return email.user
            except EmailAddress.DoesNotExist:
                return None

        if username:
            try:
                user = get_user_model().objects.get(username__iexact=username)
                if user.check_password(password):
                    return user
            except Exception:
                return None

        return None
