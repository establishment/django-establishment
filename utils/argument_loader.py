from __future__ import annotations

import inspect
from inspect import Parameter, isclass
from typing import Optional, Any, Callable

from django.core.exceptions import ImproperlyConfigured

from establishment.utils.http.view_context import BaseViewContext, get_raw_view_context_or_raise


class ArgumentLoader:
    @staticmethod
    def is_subclass_of(param: Parameter, cls: type) -> bool:
        return (param.annotation != Parameter.empty
                and isclass(param.annotation)
                and issubclass(param.annotation, cls))

    @staticmethod
    def is_class(param: Parameter, cls: type) -> bool:
        return param.annotation == cls

    @staticmethod
    def is_class_or_optional_of_class(param: Parameter, cls: type) -> bool:
        return param.annotation == cls or param.annotation == Optional[cls]

    @staticmethod
    def is_optional_of(param: Parameter, cls: type) -> bool:
        return param.annotation == Optional[cls]

    # Implement this to first report if you can handle a certain argument
    def can_load_type(self, param: Parameter) -> bool: raise NotImplementedError

    # Actually handle the loading logic here
    def load(self, param: Parameter) -> Any: raise NotImplementedError


def make_arguments_loader_func(handler: Callable, argument_loaders: list[ArgumentLoader]) -> Callable[[], list[Any]]:
    loaders: list[tuple[ArgumentLoader, Parameter]] = []
    handler_params: list[Parameter] = list(inspect.signature(handler).parameters.values())

    if len(handler_params) > 0 and handler_params[0].name == "self" and handler_params[0].annotation == Parameter.empty:
        handler_params = handler_params[1:]

    for param in handler_params:
        for argument_loader in argument_loaders:
            if argument_loader.can_load_type(param):
                loaders.append((argument_loader, param))
                break
        else:
            raise ImproperlyConfigured(f"Invalid view signature of view {handler.__qualname__}:"
                                       f" cannot parse argument {param.name} of type {param.annotation}")

    def load_arguments() -> list[Any]:
        # TODO would be nicer if we could actually use the view_context
        return [matcher.load(param) for matcher, param in loaders]

    return load_arguments


class ViewContextArgumentLoader(ArgumentLoader):
    def can_load_type(self, param: Parameter) -> bool:
        return self.is_subclass_of(param, BaseViewContext)

    def load(self, param: Parameter) -> BaseViewContext:
        return get_raw_view_context_or_raise()
