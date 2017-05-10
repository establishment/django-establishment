from PIL import Image
from django.http import HttpResponse

from establishment.accounts.models import EmailStatus
from establishment.funnel.base_views import superuser_required


@superuser_required
def send_campaign(request):
    pass


@superuser_required
def edit_campaign(request):
    pass


@superuser_required
def edit_template(request):
    pass


def track_email(request):
    email_status = EmailStatus.objects.get(key=request.GET["statusKey"])
    email_status.mark_read()

    image = Image.new('RGBA', (1, 1), (255, 255, 255, 0))
    response = HttpResponse(content_type="image/png")
    image.save(response, "PNG")
    return response
