from django.conf.urls import url
from . import views

urlpatterns = [
    url(r"^article/manager/$", views.article_manager_view),
    url(r"^article/(?P<article_id>\d+)/edit/$", views.edit_article),
    url(r"^article/(?P<article_id>\d+)/get_translations/$", views.get_translations),
    url(r"^article/(?P<article_id>\d+)/set_owner/$", views.set_article_owner),
    url(r"^article/(?P<article_id>\d+)/delete/$", views.delete_article),
    url(r"^full_article/$", views.full_article),
    url(r"^fetch_article/$", views.fetch_article),
    url(r"^get_available_articles/$", views.get_available_articles),
    url(r"^create_article/$", views.create_article),

    url(r"^send_feedback/$", views.send_feedback),
    url(r"^questionnaire_state/$", views.questionnaire_state),
    url(r"^questionnaire_all_answers/$", views.questionnaire_all_answers),
    url(r"^questionnaire_answer/$", views.questionnaire_answer),
    url(r"^questionnaire_submit/$", views.questionnaire_submit)
]
