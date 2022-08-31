from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^edit_translation/$", views.edit_translation),
]
