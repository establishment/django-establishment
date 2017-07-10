from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^manager/", views.email_manager),
    url(r"^control/$", views.control),
    url(r"^signature.png$", views.track_email)
]
