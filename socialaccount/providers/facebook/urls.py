from django.urls import re_path

from . import views

urlpatterns = [
    re_path('^facebook/login/token/$', views.login_by_token, name="facebook_login_by_token")
]

