from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^create_forum_thread/$", views.create_forum_thread),
    url(r"^edit_forum_thread/$", views.edit_forum_thread),
    url(r"^forum_thread_post/$", views.forum_thread_post),
    url(r"^forum_state/$", views.forum_state),
    url(r"^latest_forum_state/$", views.latest_forum_state),
    url(r"^forum_thread_state/$", views.forum_thread_state),
    url(r'^', views.single_page_forum)
]