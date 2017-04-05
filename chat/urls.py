from django.conf.urls import url
from establishment.chat import views

urlpatterns = [
    url(r"^private_chat_list/$", views.private_chat_list),
    url(r"^private_chat_state/$", views.private_chat_state, name="private_chat_state"),
    url(r"^private_chat_post/$", views.private_chat_post, name="private_chat_post"),
    url(r"^private_chat_mark_read/$", views.private_chat_mark_read, name="private_chat_mark_read"),
    url(r"^group_chat_state/$", views.group_chat_state, name="group_chat_state"),
    url(r"^group_chat_post/$", views.group_chat_post, name="group_chat_post"),
    url(r"^edit_message/$", views.edit_message, name="edit_message"),
]
