from django.conf.urls import url

from . import views

urlpatterns = [
    url('^github/login/token/$', views.login_by_token, name="github_login_by_token")
]

