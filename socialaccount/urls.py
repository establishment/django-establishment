from establishment.socialaccount.models import SocialProvider

urlpatterns = []

provider_list = SocialProvider.provider_list()

for provider in provider_list:
    urlpatterns += provider.get_urlpatterns()
