from establishment.funnel.base_views import superuser_required, ajax_required, JSONErrorResponse, JSONResponse, single_page_app
from establishment.funnel.utils import GlobalObjectCache
from .models import CommandInstance, CommandRun


@superuser_required
@ajax_required
def run_command(request):
    command_instance_id = request.POST["commandInstanceId"]
    try:
        command_instance = CommandInstance.objects.get(id=command_instance_id)
    except Exception:
        return JSONErrorResponse("Invalid command id")
    command_run = CommandRun.run(request.user, command_instance)
    state = GlobalObjectCache()
    state.add(command_run)
    return JSONResponse({"state": state})


@superuser_required
@single_page_app
def command_manager(request):
    state = GlobalObjectCache()
    state.add_all(CommandInstance.objects.all())
    state.add_all(CommandRun.objects.all())
    return JSONResponse({"state": state})
