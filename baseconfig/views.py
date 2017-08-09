from establishment.funnel.base_views import superuser_required, ajax_required, JSONErrorResponse, single_page_app
from establishment.funnel.state import State
from establishment.misc.threading_helper import ThreadHandler
from .models import CommandInstance, CommandRun


@superuser_required
@ajax_required
def run_command(request):
    command_instance_id = request.POST["commandInstanceId"]
    try:
        command_instance = CommandInstance.objects.get(id=command_instance_id)
    except Exception:
        return JSONErrorResponse("Invalid command id")

    def run():
        CommandRun.run(request.user, command_instance)
    ThreadHandler("commandthread", run)

    return {}


@superuser_required
@single_page_app
def command_manager(request):
    return State.from_objects(CommandInstance.objects.all(), CommandRun.objects.all())
