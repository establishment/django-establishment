from django.conf.urls import url

from .views import *

urlpatterns = [
    url(r"^run_command/$", run_command),
    url(r"^command/manager/$", command_manager),
]
