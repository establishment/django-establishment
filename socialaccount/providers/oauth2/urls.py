from django.urls import re_path, include


def import_attribute(path):
    import importlib
    pkg, attr = path.rsplit('.', 1)
    ret = getattr(importlib.import_module(pkg), attr)
    return ret


def default_urlpatterns(provider):
    login_view = import_attribute(provider.package + '.views.oauth2_login')
    callback_view = import_attribute(provider.package + '.views.oauth2_callback')

    urlpatterns = [
        re_path('^login/$', login_view, name=provider.id + "_login"),
        re_path('^login/callback/$', callback_view, name=provider.id + "_callback"),
    ]

    return [re_path('^' + provider.id + '/', include(urlpatterns))]
