from PIL import Image
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse

from establishment.webapp.base_views import superuser_required, single_page_app
from establishment.webapp.state import State
from mercury.api import MercuryRedisAPI
from .errors import EmailingError
from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway


@superuser_required
@single_page_app
def email_manager(request):
    return State.from_objects(EmailCampaign.objects.all(), EmailTemplate.objects.all(), EmailGateway.objects.all())


@superuser_required
def control(request):
    def load_field(field_name):
        value = request.POST.get(field_name)
        if value is None:
            raise EmailingError.FIELD_NOT_FOUND.with_extra({"fieldName": field_name})
        return value

    def get_obj(cls, query_value):
        try:
            obj = cls.objects.get(id=query_value)
        except ObjectDoesNotExist:
            raise EmailingError.INVALID_ID
        return obj

    object_type = load_field("objectType")
    action = load_field("action")

    if object_type == "campaign":
        if action == "start":
            campaign_id = load_field("id")
            campaign = get_obj(EmailCampaign, campaign_id)
            if campaign.manual_send_only:
                return EmailingError.INVALID_CAMPAIGN_START
            return MercuryRedisAPI.get_api().send_campaign_start(campaign_id)
        elif action == "test":
            campaign_id = load_field("id")
            id_from = load_field("fromId")
            id_to = load_field("toId")
            return MercuryRedisAPI.get_api().send_campaign_test(campaign_id, id_from, id_to)
        elif action == "clearStatus":
            campaign_id = load_field("id")
            EmailStatus.objects.all().filter(campaign_id=campaign_id).delete()
        elif action == "update":
            campaign_id = load_field("id")
            campaign = get_obj(EmailCampaign, campaign_id)
            updated_fields = campaign.update_from_dict(request.POST)
            campaign.save(update_fields=updated_fields)
            campaign.publish_update_event()
        elif action == "new":
            campaign = EmailCampaign.create_from_request(request)
            campaign.save()
            campaign.publish_update_event()
        elif action == "delete":
            campaign_id = load_field("id")
            campaign = get_obj(EmailCampaign, campaign_id)
            campaign.publish_update_event(event_type="delete")
            campaign.delete()
        else:
            return EmailingError.INVALID_ACTION
    elif object_type == "gateway":
        if action == "update":
            gateway_id = load_field("id")
            gateway = get_obj(EmailGateway, gateway_id)
            updated_fields = gateway.update_from_dict(request.POST)
            gateway.save(update_fields=updated_fields)
            gateway.publish_update_event()
        elif action == "new":
            gateway = EmailGateway.create_from_request(request)
            gateway.save()
            gateway.publish_update_event()
        elif action == "delete":
            gateway_id = load_field("id")
            gateway = get_obj(EmailGateway, gateway_id)
            gateway.publish_update_event(event_type="delete")
            gateway.delete()
        else:
            return EmailingError.INVALID_ACTION
    elif object_type == "template":
        if action == "update":
            template_id = load_field("id")
            template = get_obj(EmailTemplate, template_id)
            updated_fields = template.update_from_dict(request.POST)
            template.save(update_fields=updated_fields)
            template.publish_update_event()
        elif action == "new":
            template = EmailTemplate.create_from_request(request)
            template.save()
            template.publish_update_event()
        elif action == "delete":
            template_id = load_field("id")
            template = get_obj(EmailTemplate, template_id)
            template.publish_update_event(event_type="delete")
            template.delete()
        else:
            return EmailingError.INVALID_ACTION
    else:
        return EmailingError.INVALID_OBJECT_TYPE
    return {"message": "Success!"}


def track_email(request):
    try:
        email_status = EmailStatus.objects.get(key=request.GET["statusKey"])
        email_status.mark_read()
    except:
        pass

    image = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
