from __future__ import annotations

from inspect import Parameter, isclass
from typing import Optional, Any


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
