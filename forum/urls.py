from django.urls import include, path

from .views import forum_views, forum_page_views

urlpatterns = [
    path("", include(forum_views.build_url_patterns())),
    path("", include(forum_page_views.build_url_patterns())),
]
