from django.urls import include, path

from .views import blog_views, blog_page_views

urlpatterns = [
    path("", include(blog_views.build_url_patterns())),
    path("", include(blog_page_views.build_url_patterns())),
]
