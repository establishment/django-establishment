import importlib

from establishment.socialaccount import providers

urlpatterns = []

for provider in providers.registry.get_list():
    try:
        provider_module = importlib.import_module(provider.package + ".urls")
    except ImportError:
        continue
    provider_urlpatterns = getattr(provider_module, "urlpatterns", [])
    urlpatterns += provider_urlpatterns
