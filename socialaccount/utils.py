from .models import SocialApp

def add_social_apps_to_public_state(state, global_variables, context):
    print("here")
    state.add_all(SocialApp.objects.all())
