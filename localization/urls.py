from django.urls import include, path

from .views import localization_views

urlpatterns = [
    path("", include(localization_views.build_url_patterns())),
]
