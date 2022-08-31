from django.urls import re_path

from . import views

urlpatterns = [
    re_path('^github/login/token/$', views.login_by_token, name="github_login_by_token")
]

