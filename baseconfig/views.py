from typing import Any

from establishment.accounts.models import AbstractStreamObjectUser
from establishment.misc.threading_helper import ThreadHandler
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import ObjectId
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin
from .models import CommandInstance, CommandRun

baseconfig_views = WebappViewSet(permissions=is_admin)


class RunCommandRequest(BaseRequest):
    command_instance_id: ObjectId[CommandInstance]
    arguments: dict[str, Any] = {}


@baseconfig_views.post()
def run_command(request: RunCommandRequest, user: AbstractStreamObjectUser) -> dict[str, Any]:
    command_instance = request.command_instance_id.obj

    def run() -> None:
        CommandRun.run(user, command_instance, request.arguments)
    ThreadHandler("commandthread", run)

    return {}


@baseconfig_views.single_page_app(url_path="command/manager")
def command_manager() -> State:
    return State(CommandInstance.objects.all(), CommandRun.objects.all())
