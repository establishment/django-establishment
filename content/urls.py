from django.urls import re_path
from . import views

urlpatterns = [
    re_path(r"^article/manager/$", views.article_manager_view),
    re_path(r"^article/(?P<article_id>\d+)/edit/$", views.edit_article),
    re_path(r"^article/(?P<article_id>\d+)/get_translations/$", views.get_translations),
    re_path(r"^article/(?P<article_id>\d+)/set_owner/$", views.set_article_owner),
    re_path(r"^article/(?P<article_id>\d+)/delete/$", views.delete_article),
    re_path(r"^full_article/$", views.full_article),
    re_path(r"^fetch_article/$", views.fetch_article),
    re_path(r"^get_available_articles/$", views.get_available_articles),
    re_path(r"^create_article/$", views.create_article),

    re_path(r"^send_feedback/$", views.send_feedback),
    re_path(r"^questionnaire_state/$", views.questionnaire_state),
    re_path(r"^questionnaire_all_answers/$", views.questionnaire_all_answers),
    re_path(r"^questionnaire_answer/$", views.questionnaire_answer),
    re_path(r"^questionnaire_submit/$", views.questionnaire_submit)
]
