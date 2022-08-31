from django.urls import re_path

from establishment.documentation import views

urlpatterns = [
    re_path(r"^edit_entry/$", views.edit_entry),
    re_path(r"^create/$", views.create_entry),
    re_path(r"^change_parents/$", views.change_parents),
    re_path(r"^edit/", views.edit_documentation),
    re_path(r"^", views.documentation)
]
