from django.apps import AppConfig


class AccountsAppConfig(AppConfig):
    name = "establishment.accounts"

    def ready(self):
        from establishment.utils.state import STATE_SERIALIZATION_MIDDLEWARE
        from establishment.accounts.models import add_own_user_reactions_to_state

        STATE_SERIALIZATION_MIDDLEWARE.append(add_own_user_reactions_to_state)
