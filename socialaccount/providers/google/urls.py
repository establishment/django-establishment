from django.conf.urls import url

from . import views

urlpatterns = [
    url('^google/login/token/$', views.login_by_token, name="google_login_by_token")
]

