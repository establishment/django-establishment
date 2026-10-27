from django.urls import include, path

from .views import content_views

urlpatterns = [
    path("", include(content_views.build_url_patterns())),
]
