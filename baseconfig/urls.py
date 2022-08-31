from django.urls import re_path

from .views import *

urlpatterns = [
    re_path(r"^run_command/$", run_command),
    re_path(r"^command/manager/$", command_manager),
]
