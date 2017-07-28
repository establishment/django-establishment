from django.conf.urls import url, include


def import_attribute(path):
    import importlib
    pkg, attr = path.rsplit('.', 1)
    ret = getattr(importlib.import_module(pkg), attr)
    return ret


def default_urlpatterns(provider):
    login_view = import_attribute(provider.package + '.views.oauth2_login')
    callback_view = import_attribute(provider.package + '.views.oauth2_callback')

    urlpatterns = [
        url('^login/$', login_view, name=provider.id + "_login"),
        url('^login/callback/$', callback_view, name=provider.id + "_callback"),
    ]

    return [url('^' + provider.id + '/', include(urlpatterns))]
