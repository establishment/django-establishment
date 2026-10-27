from typing import Any, Optional

from PIL import Image
from django.db.models import Model
from django.http import HttpResponse

from establishment.utils.http.permissions import allow_any
from establishment.utils.http.request import BaseRequest
from establishment.utils.http.request_fields import edit_object_from_request
from establishment.utils.state import State
from establishment.webapp.view_set import WebappViewSet, is_admin
from mercury.api import MercuryRedisAPI
from .errors import EmailingError
from .models import EmailStatus, EmailCampaign, EmailTemplate, EmailGateway

emailing_views = WebappViewSet(permissions=is_admin)


@emailing_views.single_page_app(url_path=r"^manager/")
def email_manager() -> State:
    return State(EmailCampaign.objects.all(), EmailTemplate.objects.all(), EmailGateway.objects.all())


def get_email_object[T: Model](model_class: type[T], object_id: int) -> T:
    obj = model_class.objects.filter(id=object_id).first()
    if obj is None:
        raise EmailingError.INVALID_ID
    return obj


class SaveRequest(BaseRequest):
    id: Optional[int] = None  # Absent for a new object


def save_object(model_class: type[EmailCampaign | EmailTemplate | EmailGateway], request: SaveRequest) -> State:
    obj = model_class() if request.id is None else get_email_object(model_class, request.id)
    state = edit_object_from_request(obj, request, const_validators=[lambda edited_obj: edited_obj.full_clean()])
    obj.publish_update_event()
    return state


def delete_object(obj: EmailCampaign | EmailTemplate | EmailGateway) -> dict[str, Any]:
    obj.publish_update_event(event_type="delete")
    obj.delete()
    return {"message": "Success!"}


class ObjectIdRequest(BaseRequest):
    id: int


class SaveCampaignRequest(SaveRequest):
    name: str
    from_address: Optional[str] = None
    gateway_id: Optional[int] = None
    is_newsletter: bool = True


@emailing_views.post()
def save_campaign(request: SaveCampaignRequest) -> State:
    return save_object(EmailCampaign, request)


@emailing_views.post()
def delete_campaign(request: ObjectIdRequest) -> dict[str, Any]:
    return delete_object(get_email_object(EmailCampaign, request.id))


@emailing_views.post()
def start_campaign(request: ObjectIdRequest) -> dict[str, Any]:
    campaign = get_email_object(EmailCampaign, request.id)
    if campaign.manual_send_only:
        raise EmailingError.INVALID_CAMPAIGN_START
    return MercuryRedisAPI.get_api().send_campaign_start(campaign.id)


class TestCampaignRequest(BaseRequest):
    id: int
    receiver_id: int


@emailing_views.post()
def test_campaign(request: TestCampaignRequest) -> dict[str, Any]:
    campaign = get_email_object(EmailCampaign, request.id)
    return MercuryRedisAPI.get_api().send_campaign_test(campaign.id, request.receiver_id)


@emailing_views.post()
def clear_campaign_status(request: ObjectIdRequest) -> dict[str, Any]:
    campaign = get_email_object(EmailCampaign, request.id)
    EmailStatus.objects.filter(campaign_id=campaign.id).delete()
    return {"message": "Success!"}


class SaveTemplateRequest(SaveRequest):
    subject: str
    html: str
    campaign_id: int
    language_id: int
    gateway_id: Optional[int] = None


@emailing_views.post()
def save_template(request: SaveTemplateRequest) -> State:
    return save_object(EmailTemplate, request)


@emailing_views.post()
def delete_template(request: ObjectIdRequest) -> dict[str, Any]:
    return delete_object(get_email_object(EmailTemplate, request.id))


class SaveGatewayRequest(SaveRequest):
    name: str
    host: str
    port: int
    use_tls: bool
    username: str
    password: Optional[str] = None  # Absent keeps the stored one


@emailing_views.post()
def save_gateway(request: SaveGatewayRequest) -> State:
    return save_object(EmailGateway, request)


@emailing_views.post()
def delete_gateway(request: ObjectIdRequest) -> dict[str, Any]:
    return delete_object(get_email_object(EmailGateway, request.id))


class TrackEmailRequest(BaseRequest):
    status_key: Optional[str] = None


# Fetched by an email client as it shows the email, so it carries no session
@emailing_views.get(url_path=r"^signature\.png$", permissions=allow_any)
def track_email(request: TrackEmailRequest) -> HttpResponse:
    email_status = EmailStatus.objects.filter(key=request.status_key).first() if request.status_key else None
    if email_status is not None:
        email_status.mark_read()

    image = Image.new("RGBA", (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
