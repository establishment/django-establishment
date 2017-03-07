from django.conf.urls import url

from establishment.localization import views

urlpatterns = [
    url(r"^edit_translation/$", views.edit_translation),
]
