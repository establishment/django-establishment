from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^edit_translation/$", views.edit_translation),
]
