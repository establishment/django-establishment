import json

from establishment.misc.threading_helper import ThreadHandler
from establishment.webapp.base_views import superuser_required, ajax_required, single_page_app
from establishment.webapp.state import State
from .errors import BaseconfigError
from .models import CommandInstance, CommandRun


@superuser_required
@ajax_required
def run_command(request):
    command_instance_id = request.POST["commandInstanceId"]
    arguments = json.loads(request.POST.get("arguments", "{}"))
    try:
        command_instance = CommandInstance.objects.get(id=command_instance_id)
    except Exception:
        return BaseconfigError.INVALID_COMMAND_INSTANCE

    def run():
        CommandRun.run(request.user, command_instance, arguments)
    ThreadHandler("commandthread", run)

    return {}


@superuser_required
@single_page_app
def command_manager(request):
    return State.from_objects(CommandInstance.objects.all(), CommandRun.objects.all())
