from django.contrib.sites.models import Site
from django.urls import reverse
from django.conf import settings
from django.template.loader import render_to_string
from django.template import TemplateDoesNotExist
from django.core.mail import EmailMultiAlternatives, EmailMessage, get_connection

from django.utils.encoding import force_text

from establishment.misc.util import import_module_attribute


def format_email_subject(subject, add_prefix=True):
    site = Site.objects.get_current()
    prefix = "[{name}] ".format(name=site.name)
    result = force_text(subject)
    if add_prefix:
        result = prefix + result
    return result


def render_template_mail(template_prefix, email, context, add_subject_prefix=True):
    """
    Renders an e-mail to `email`.  `template_prefix` identifies the
    e-mail that is to be sent, e.g. "account/email/email_confirmation"
    """
    subject = render_to_string('{0}_subject.txt'.format(template_prefix), context)
    # remove superfluous line breaks
    subject = " ".join(subject.splitlines()).strip()
    subject = format_email_subject(subject, add_prefix=add_subject_prefix)

    bodies = {}
    for ext in ['html', 'txt']:
        try:
            template_name = '{0}_message.{1}'.format(template_prefix, ext)
            bodies[ext] = render_to_string(template_name, context).strip()
        except TemplateDoesNotExist:
            if ext == 'txt' and not bodies:
                # We need at least one body
                raise
    with get_connection(
            host=settings.ACCOUNTS_EMAIL_HOST,
            port=settings.ACCOUNTS_EMAIL_PORT,
            username=settings.ACCOUNTS_EMAIL_USER,
            password=settings.ACCOUNTS_EMAIL_PASSWORD,
            use_tls=settings.ACCOUNTS_EMAIL_TLS
    ) as connection:
        if 'txt' in bodies:
            msg = EmailMultiAlternatives(subject, bodies['txt'], settings.DEFAULT_FROM_EMAIL, [email], connection=connection)
            if 'html' in bodies:
                msg.attach_alternative(bodies['html'], 'text/html')
        else:
            msg = EmailMessage(subject, bodies['html'], settings.DEFAULT_FROM_EMAIL, [email], connection=connection)
            msg.content_subtype = 'html'  # Main content is now text/html

    return msg


def send_template_mail(template_prefix, email, context, add_subject_prefix=True):
    msg = render_template_mail(template_prefix, email, context, add_subject_prefix=add_subject_prefix)
    msg.send()


def send_verification_mail(request, unverified_email, signup):
    current_site = Site.objects.get_current(request=request)
    url = reverse("account_email_verify", args=[unverified_email.key])
    activate_url = request.build_absolute_uri(url)
    context = {
        "user": unverified_email.user,
        "activate_url": activate_url,
        "current_site": current_site,
        "key": unverified_email.key,
    }

    if signup:
        email_template = "account/email/email_confirmation_signup"
    else:
        email_template = "account/email/email_confirmation"

    send_template_mail(email_template, unverified_email.email, context)


def get_user_manager():
    from django.contrib.auth import get_user_model
    return get_user_model().objects


def get_public_user_class():
    from .models import PublicUserWrapper
    public_user_class = getattr(settings, "PUBLIC_USER_CLASS", PublicUserWrapper)
    if isinstance(public_user_class, str):
        public_user_class = import_module_attribute(public_user_class)
    return public_user_class


def get_request_param(request, param, default=None):
    return request.POST.get(param) or request.GET.get(param, default)


def get_user_search_fields():
    from django.contrib.auth import get_user_model
    user_model_instance = get_user_model()()
    return filter(lambda attr: hasattr(user_model_instance, attr), ["username", "first_name", "last_name", "email"])


def get_user_stream_name(user_id):
    # TODO: should get the user_model class and return a class method from it
    return "user-" + str(user_id) + "-events"
