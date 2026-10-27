from django.urls import include, path

from .views import documentation_views, documentation_page_views

urlpatterns = [
    path("", include(documentation_views.build_url_patterns())),
    path("", include(documentation_page_views.build_url_patterns())),
]
