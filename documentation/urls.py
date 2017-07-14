from django.conf.urls import url

from establishment.documentation import views

urlpatterns = [
    url(r"^edit_entry/$", views.edit_entry),
    url(r"^create/$", views.create_entry),
    url(r"^change_parents/$", views.change_parents),
    url(r"^edit/", views.edit_documentation),
    url(r"^", views.documentation)
]
