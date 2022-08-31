from django.urls import re_path
from establishment.chat import views

urlpatterns = [
    re_path(r"^private_chat_list/$", views.private_chat_list),
    re_path(r"^private_chat_state/$", views.private_chat_state, name="private_chat_state"),
    re_path(r"^private_chat_post/$", views.private_chat_post, name="private_chat_post"),
    re_path(r"^private_chat_mark_read/$", views.private_chat_mark_read, name="private_chat_mark_read"),
    re_path(r"^group_chat_state/$", views.group_chat_state, name="group_chat_state"),
    re_path(r"^group_chat_post/$", views.group_chat_post, name="group_chat_post"),
    re_path(r"^edit_message/$", views.edit_message, name="edit_message"),
]
