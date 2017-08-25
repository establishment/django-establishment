from .models import SocialApp


def add_social_apps_to_public_state(state, global_variables, context):
    state.add_all(SocialApp.objects.all())
