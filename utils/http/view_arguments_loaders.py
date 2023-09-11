from inspect import Parameter

from django.http import HttpRequest

from establishment.utils.argument_loader import ArgumentLoader
from establishment.utils.http.view_context import get_raw_view_context_or_raise


class URLArg(str):
    pass


# Loads parameters from the url (for instance from /path/{object_id}/action) intro string
class URLArgLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, URLArg)

    def load(self, param: Parameter):
        view_context = get_raw_view_context_or_raise()

        return view_context.view_kwargs[param.name]


class DjangoRequestViewArgumentLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, HttpRequest)

    def load(self, param: Parameter) -> HttpRequest:
        view_context = get_raw_view_context_or_raise()
        return view_context.raw_request
