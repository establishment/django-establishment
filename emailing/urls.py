from django.urls import include, path

from .views import emailing_views

urlpatterns = [
    path("", include(emailing_views.build_url_patterns())),
]
