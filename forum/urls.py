from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r"^create_forum_thread/$", views.create_forum_thread),
    re_path(r"^edit_forum_thread/$", views.edit_forum_thread),
    re_path(r"^forum_thread_post/$", views.forum_thread_post),
    re_path(r"^forum_state/$", views.forum_state),
    re_path(r"^forum_thread_state/$", views.forum_thread_state),
    re_path(r'^', views.main_forum_view)
]
