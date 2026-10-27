from django.urls import include, path

import establishment.socialaccount.urls
from .views import accounts_views

urlpatterns = [
    path("", include(accounts_views.build_url_patterns())),
]

urlpatterns += establishment.socialaccount.urls.urlpatterns
