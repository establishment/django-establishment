from django.urls import include, path

from .views import chat_views

urlpatterns = [
    path("", include(chat_views.build_url_patterns())),
]
