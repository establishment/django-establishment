from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^get_blog_post/$', views.get_blogpost),
    url(r'^add_entry/$', views.add_entry),
    url(r'^change_entry_settings/$', views.change_entry_settings),
    url(r'^create_entry_discussion/$', views.create_entry_discussion),
    url(r'^latest_blog_state/$', views.latest_blog_state),
    url(r'^', views.blog_single_page),
]
