from PIL import Image
from django.http import HttpResponse
import json

from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway
from establishment.funnel.base_views import superuser_required, single_page_app, JSONResponse, JSONErrorResponse
from establishment.funnel.utils import GlobalObjectCache
from establishment.localization.models import Language
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
    object_type = request.POST.get("objectType")
    action = request.POST.get("action")

    if object_type is None:
        return JSONErrorResponse("Invalid request! Field \"objectType\" not found!")
    if action is None:
        return JSONErrorResponse("Invalid request! Field \"action\" not found!")

    response = {}
    if object_type == "campaign":
        if action in ["start", "stop", "pause", "continue"]:
            campaign_id = request.POST.get("id")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            response = MercuryRedisAPI.get_api().generic_action(objectType=object_type, action=action, campaign_id=campaign_id)
        elif action == "update":
            campaign_id = request.POST.get("id")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            name = request.POST.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            from_address = request.POST.get("fromAddress")
            if from_address is None:
                return JSONErrorResponse("Invalid request! Field \"fromAddress\" not found!")
            gateway_id = request.POST.get("gatewayId")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"gatewayId\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"gatewayId\"!")
            try:
                campaign = EmailCampaign.objects.get(id=campaign_id)
            except EmailCampaign.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"id\"!")
            is_newsletter = json.loads(request.POST.get("isNewsletter"))
            if is_newsletter is None:
                return JSONErrorResponse("Invalid request! Field \"isNewsletter\" not found")
            campaign.name = name
            campaign.from_address = from_address
            campaign.gateway = gateway
            campaign.is_newsletter = is_newsletter
            campaign.save()
            campaign.publish_update_event()
            response = {"message": "Success!"}
        elif action == "new":
            name = request.POST.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            from_address = request.POST.get("fromAddress")
            if from_address is None:
                return JSONErrorResponse("Invalid request! Field \"fromAddress\" not found!")
            gateway_id = request.POST.get("gatewayId")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"gatewayId\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"gatewayId\"!")
            is_newsletter = json.loads(request.POST.get("isNewsletter"))
            if is_newsletter is None:
                return JSONErrorResponse("Invalid request! Field \"isNewsletter\" not found")
            campaign = EmailCampaign(name=name, from_address=from_address, gateway=gateway,
                                     is_newsletter=is_newsletter)
            campaign.save()
            campaign.publish_update_event()
            response = {"message": "Success!"}
        elif action == "delete":
            campaign_id = request.POST.get("id")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            try:
                campaign = EmailGateway.objects.get(id=gateway_id)
                campaign.publish_update_event(event_type="delete")
                campaign.delete()
            except EmailCampaign.DoesNotExist:
                return JSONErrorResponse("Invalid request! Field value for field \"id\"!")
            response = {"message": "Success!"}
        else:
            return JSONErrorResponse("Invalid request! Invalid value for field \"action\"!")
    elif object_type == "gateway":
        if action == "update":
            gateway_id = request.POST.get("id")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            name = request.POST.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            host = request.POST.get("host")
            if host is None:
                return JSONErrorResponse("Invalid request! Field \"host\" not found!")
            port = request.POST.get("port")
            if port is None:
                return JSONErrorResponse("Invalid request! Field \"port\" not found!")
            use_tls = json.loads(request.POST.get("useTLS"))
            if use_tls is None:
                return JSONErrorResponse("Invalid request! Field \"useTLS\" not found!")
            username = request.POST.get("username")
            if username is None:
                return JSONErrorResponse("Invalid request! Field \"username\" not found!")
            password = request.POST.get("password")
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
            name = request.POST.get("name")
            if name is None:
                return JSONErrorResponse("Invalid request! Field \"name\" not found!")
            host = request.POST.get("host")
            if host is None:
                return JSONErrorResponse("Invalid request! Field \"host\" not found!")
            port = request.POST.get("port")
            if port is None:
                return JSONErrorResponse("Invalid request! Field \"port\" not found!")
            use_tls = json.loads(request.POST.get("useTLS"))
            if use_tls is None:
                return JSONErrorResponse("Invalid request! Field \"useTLS\" not found!")
            username = request.POST.get("username")
            if username is None:
                return JSONErrorResponse("Invalid request! Field \"username\" not found!")
            password = request.POST.get("password")
            if password is None:
                return JSONErrorResponse("Invalid request! Field \"password\" not found!")
            gateway = EmailGateway(name=name, host=host, port=port, use_tls=use_tls, username=username,
                                          password=password)
            gateway.save()
            gateway.publish_update_event()
            response = {"message": "Success!"}
        elif action == "delete":
            gateway_id = request.POST.get("id")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
                gateway.publish_update_event(event_type="delete")
                gateway.delete()
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Field value for field \"id\"!")
            response = {"message": "Success!"}
        else:
            return JSONErrorResponse("Invalid request! Invalid value for field \"action\"!")
    elif object_type == "template":
        if action == "update":
            template_id = request.POST.get("id")
            if template_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            subject = request.POST.get("subject")
            if subject is None:
                return JSONErrorResponse("Invalid request! Field \"subject\" not found!")
            html = request.POST.get("html")
            if html is None:
                return JSONErrorResponse("Invalid request! Field \"html\" not found!")
            campaign_id = request.POST.get("campaignId")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"campaignId\" not found!")
            try:
                campaign = EmailCampaign.objects.get(id=campaign_id)
            except EmailCampaign.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"campaignId\"!")
            language_id = request.POST.get("languageId")
            if language_id is None:
                return JSONErrorResponse("Invalid request! Field \"languageId\" not found!")
            try:
                language = Language.objects.get(id=language_id)
            except Language.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"languageId\"!")
            gateway_id = request.POST.get("gatewayId")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"gatewayId\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"gatewayId\"!")
            try:
                template = EmailTemplate.objects.get(id=template_id)
            except EmailTemplate.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"id\"!")
            template.subject = subject
            template.html = html
            template.campaign = campaign
            template.language = language
            template.gateway = gateway
            template.save()
            template.publish_update_event()
            response = {"message": "Success!"}
        elif action == "new":
            subject = request.POST.get("subject")
            if subject is None:
                return JSONErrorResponse("Invalid request! Field \"subject\" not found!")
            html = request.POST.get("html")
            if html is None:
                return JSONErrorResponse("Invalid request! Field \"html\" not found!")
            campaign_id = request.POST.get("campaignId")
            if campaign_id is None:
                return JSONErrorResponse("Invalid request! Field \"campaignId\" not found!")
            try:
                campaign = EmailCampaign.objects.get(id=campaign_id)
            except EmailCampaign.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"campaignId\"!")
            language_id = request.POST.get("languageId")
            if language_id is None:
                return JSONErrorResponse("Invalid request! Field \"languageId\" not found!")
            try:
                language = Language.objects.get(id=language_id)
            except Language.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"languageId\"!")
            gateway_id = request.POST.get("gatewayId")
            if gateway_id is None:
                return JSONErrorResponse("Invalid request! Field \"gatewayId\" not found!")
            try:
                gateway = EmailGateway.objects.get(id=gateway_id)
            except EmailGateway.DoesNotExist:
                return JSONErrorResponse("Invalid request! Invalid value for field \"gatewayId\"!")
            template = EmailTemplate(subject=subject, html=html, campaign=campaign, language=language,
                                     gateway=gateway)
            template.save()
            template.publish_update_event()
            response = {"message": "Success!"}
        elif action == "delete":
            template_id = request.POST.get("id")
            if template_id is None:
                return JSONErrorResponse("Invalid request! Field \"id\" not found!")
            try:
                template = EmailTemplate.objects.get(id=template_id)
                template.publish_update_event(event_type="delete")
                template.delete()
            except EmailTemplate.DoesNotExist:
                return JSONErrorResponse("Invalid request! Field value for field \"id\"!")
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
