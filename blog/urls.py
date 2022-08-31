from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r'^get_blog_post/$', views.get_blogpost),
    re_path(r'^add_entry/$', views.add_entry),
    re_path(r'^change_entry_settings/$', views.change_entry_settings),
    re_path(r'^create_entry_discussion/$', views.create_entry_discussion),
    re_path(r'^', views.blog),
]
