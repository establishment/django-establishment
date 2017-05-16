from PIL import Image
from django.http import HttpResponse

from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway
from establishment.funnel.base_views import superuser_required, single_page_app, JSONResponse
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
    object_type = request.GET["objectType"]
    action = request.GET["action"]

    if object_type == "campaign":
        if action in ["start", "stop", "pause", "continue"]:
            campaign_id = request.GET["campaignId"]
            MercuryRedisAPI.get_api().generic_action(objectType=object_type, action=action, campaign_id=campaign_id)


def track_email(request):
    email_status = EmailStatus.objects.get(key=request.GET["statusKey"])
    email_status.mark_read()

    image = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
