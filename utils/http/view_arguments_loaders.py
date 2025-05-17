from __future__ import annotations

from inspect import Parameter
from typing import Any

from django.http import HttpRequest

from establishment.utils.argument_loader import ArgumentLoader
from establishment.utils.http.view_context import BaseViewContext


class URLArg(str):
    pass


# Loads parameters from the url (for instance from /path/{object_id}/action) intro string
class URLArgLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, URLArg)

    def load(self, param: Parameter) -> Any:
        view_context = BaseViewContext.get()

        return view_context.view_kwargs[param.name]


class DjangoRequestViewArgumentLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, HttpRequest)

    def load(self, param: Parameter) -> HttpRequest:
        view_context = BaseViewContext.get()
        return view_context.raw_request


class ViewContextArgumentLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, BaseViewContext)

    def load(self, param: Parameter) -> BaseViewContext:
        return BaseViewContext.get()
