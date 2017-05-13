from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^manage/$', views.manage_emails),
    url(r"^signature.png$", views.track_email)
]
