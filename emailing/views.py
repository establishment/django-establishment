from PIL import Image
from django.http import HttpResponse

from establishment.accounts.utils import get_user_manager
from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway
from establishment.funnel.base_views import superuser_required, single_page_app, JSONResponse
from establishment.funnel.utils import GlobalObjectCache


@superuser_required
@single_page_app
def manage_emails(request):
    state = GlobalObjectCache(request)
    state.add_all(EmailCampaign.objects.all())
    state.add_all(EmailTemplate.objects.all())
    state.add_all(EmailGateway.objects.all())

    return JSONResponse({"state": state})


@superuser_required
def send_campaign(request):
    email_campaign = EmailCampaign.objects.get(id=request.GET["campaignId"])
    first_user_id = int(request.GET["firstUserId"])
    last_user_id = int(request.GET["lastUserId"])
    for user_id in range(first_user_id, last_user_id + 1):
        user = get_user_manager().get(id=user_id)
        # TODO: should enqueue to a daemon
        email_campaign.send_to_user(user)


def track_email(request):
    email_status = EmailStatus.objects.get(key=request.GET["statusKey"])
    email_status.mark_read()

    image = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
