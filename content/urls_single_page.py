from django.conf.urls import url
from . import views

urlpatterns = [
    url(r"^article/manager/$", views.article_manager_single_page_view),
    url(r"^article/(?P<article_id>\d+)/edit/$", views.edit_article_single_page),
    url(r"^article/(?P<article_id>\d+)/get_translations/$", views.get_translations),
    url(r"^article/(?P<article_id>\d+)/set_owner/$", views.set_article_owner),
    url(r"^article/(?P<article_id>\d+)/delete/$", views.delete_article),
    url(r"^full_article/$", views.full_article),
    url(r"^fetch_article/$", views.fetch_article),
    url(r"^get_available_articles/$", views.get_available_articles),
    url(r"^create_article/$", views.create_article),

    url(r"^send_feedback/$", views.send_feedback),
]
