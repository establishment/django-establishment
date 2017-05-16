from PIL import Image
from django.http import HttpResponse

from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway
from establishment.funnel.base_views import superuser_required, single_page_app, JSONResponse, JSONErrorResponse
from establishment.funnel.utils import GlobalObjectCache
from mercury.api import MercuryRedisAPI


@superuser_required
@single_page_app
def email_manager(request):
    state = GlobalObjectCache(request)
    state.add_all(EmailCampaign.objects.all())
    state.add_all(EmailTemplate.objects.all())
    state.add_all(EmailGateway.objects.all())

    return JSONResponse({"state": state})


@superuser_required
def control(request):
    object_type = request.GET.get("objectType")
    action = request.GET.get("action")

    if object_type is None:
        return JSONErrorResponse("Invalid request! Field \"objectType\" not found!")
    if action is None:
        return JSONErrorResponse("Invalid request! Field \"action\" not found!")

    response = {}
    if object_type == "campaign":
        if action in ["start", "stop", "pause", "continue"]:
            campaign_id = request.GET.get("campaignId")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"campaignId\" not found!")
            response = MercuryRedisAPI.get_api().generic_action(objectType=object_type, action=action, campaign_id=campaign_id)
        else:
            return JSONErrorResponse("Invalid request! Invalid value for field \"action\"!")
    elif object_type == "gateway":
        if action == "update":
            gateway_id = request.GET.get("id")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            name = request.GET.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            host = request.GET.get("host")
            if host is None:
                return JSONErrorResponse("Invalid request! Field \"host\" not found!")
            port = request.GET.get("port")
            if port is None:
                return JSONErrorResponse("Invalid request! Field \"port\" not found!")
            use_tls = request.GET.get("useTLS")
            if use_tls is None:
                return JSONErrorResponse("Invalid request! Field \"useTLS\" not found!")
            username = request.GET.get("username")
            if username is None:
                return JSONErrorResponse("Invalid request! Field \"username\" not found!")
            password = request.GET.get("password")
            if password is None:
                return JSONErrorResponse("Invalid request! Field \"password\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"id\"!")
            gateway.name = name
            gateway.host = host
            gateway.port = port
            gateway.use_tls = use_tls
            gateway.username = username
            gateway.password = password
            gateway.save()
            gateway.publish_update_event()
            response = {"message": "Success!"}
        elif action == "new":
            name = request.GET.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            host = request.GET.get("host")
            if host is None:
                return JSONErrorResponse("Invalid request! Field \"host\" not found!")
            port = request.GET.get("port")
            if port is None:
                return JSONErrorResponse("Invalid request! Field \"port\" not found!")
            use_tls = request.GET.get("useTLS")
            if use_tls is None:
                return JSONErrorResponse("Invalid request! Field \"useTLS\" not found!")
            username = request.GET.get("username")
            if username is None:
                return JSONErrorResponse("Invalid request! Field \"username\" not found!")
            password = request.GET.get("password")
            if password is None:
                return JSONErrorResponse("Invalid request! Field \"password\" not found!")
            gateway = EmailGateway.create(name=name, host=host, port=port, use_tls=use_tls, username=username,
                                          password=password)
            gateway.save()
            gateway.publish_update_event()
            response = {"message": "Success!"}
        elif action == "delete":
            gateway_id = request.GET.get("id")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
                gateway.publish_update_event(event_type="delete")
                gateway.delete()
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Field valud for field \"id\"!")
            response = {"message": "Success!"}
        else:
            return JSONErrorResponse("Invalid request! Invalid value for field \"action\"!")
    else:
        return JSONErrorResponse("Invalid request! Invalid value for field \"objectType\"!")
    return JSONResponse(response)


def track_email(request):
    email_status = EmailStatus.objects.get(key=request.GET["statusKey"])
    email_status.mark_read()

    image = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
