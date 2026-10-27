from django.urls import include, path

from .views import baseconfig_views

urlpatterns = [
    path("", include(baseconfig_views.build_url_patterns())),
]
