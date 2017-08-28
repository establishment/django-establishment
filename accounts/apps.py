from django.apps import AppConfig


class AccountsAppConfig(AppConfig):
    name = "establishment.accounts"

    def ready(self):
        from establishment.webapp.state import STATE_FILTERS
        from establishment.accounts.models import add_own_user_reactions_to_state

        STATE_FILTERS.append(add_own_user_reactions_to_state)
