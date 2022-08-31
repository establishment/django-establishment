from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^manager/", views.email_manager),
    re_path(r"^control/$", views.control),
    re_path(r"^signature.png$", views.track_email)
]
