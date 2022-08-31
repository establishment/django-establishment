from django.urls import re_path

from . import views

urlpatterns = [
    re_path('^google/login/token/$', views.login_by_token, name="google_login_by_token")
]

