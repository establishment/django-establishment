from django.conf import settings as django_settings


class SettingsWithDefault(object):
    def __init__(self, namespace_name=None, prefix_name=None, fallback_settings=None, **kwargs):
        if prefix_name is None:
            prefix_name = namespace_name

        self._fallback_settings = fallback_settings or django_settings
        self._prefix_name = (prefix_name and (prefix_name + "_")) or ""
        self._namespace_name = namespace_name
        self._defaults = kwargs

    def _get_from_namespace(self, key):
        if not self._namespace_name or not hasattr(django_settings, self._namespace_name):
            return None
        namespace = getattr(django_settings, self._namespace_name)
        if isinstance(namespace, dict):
            return (key in namespace) and namespace[key]

        return hasattr(namespace, key) and getattr(namespace, key)

    def __getattribute__(self, key):
        if key.startswith("_"):
            return object.__getattribute__(self, key)

        namespace_value = self._get_from_namespace(key)

        if namespace_value:
            return namespace_value

        # Global key names are always forces to uppercase, to conform to the django convention
        global_name = self._prefix_name + key.upper()

        if hasattr(self._fallback_settings, global_name):
            return getattr(self._fallback_settings, global_name)

        if key not in self._defaults:
            raise KeyError("Please specify setting key " + key + " in setting " + self._namespace_name)

        return self._defaults[key]

    def __setattr__(self, key, value):
        if key.startswith("_"):
            return object.__setattr__(self, key, value)
        self._defaults[key] = value
