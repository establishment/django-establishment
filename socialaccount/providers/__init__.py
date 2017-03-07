from django.conf import settings

import importlib


# TODO: why are these not static/class methods, with a global class
class ProviderRegistry(object):
    def __init__(self):
        self.provider_map = {}
        self.loaded = False

    def get_list(self):
        self.load()
        return self.provider_map.values()

    def register(self, cls):
        self.provider_map[cls.id] = cls()

    def by_id(self, id):
        self.load()
        return self.provider_map[id]

    def as_choices(self):
        self.load()

        choice_list = [(provider.id, provider.name) for provider in self.get_list()]

        # Sort this list, to always have the same choices
        choice_list.sort(key=lambda provider_tuple: provider_tuple[0])

        return choice_list

    def load(self):
        if not self.loaded:
            for app in settings.INSTALLED_APPS:
                provider_module = app + '.provider'
                try:
                    importlib.import_module(provider_module)
                except ImportError as e:
                    pass
            self.loaded = True


registry = ProviderRegistry()
