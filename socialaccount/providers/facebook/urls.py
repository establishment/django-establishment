from django.conf.urls import url

from . import views

urlpatterns = [
    url('^facebook/login/token/$', views.login_by_token, name="facebook_login_by_token")
]

