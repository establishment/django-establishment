from django.urls import include, path

from .views import facebook_views

urlpatterns = [
    path("", include(facebook_views.build_url_patterns())),
]
