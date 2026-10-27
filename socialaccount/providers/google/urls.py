from django.urls import include, path

from .views import google_views

urlpatterns = [
    path("", include(google_views.build_url_patterns())),
]
