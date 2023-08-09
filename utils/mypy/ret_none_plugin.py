from typing import Union

from mypy.plugin import Plugin, MethodSigContext, FunctionSigContext
from mypy.suggestions import is_explicit_any
from mypy.types import AnyType, Type, NoneType


class RetNonePlugin(Plugin):
    IGNORE_LIST = [
        "builtins.",
        "typing.",
        "copy.",
        "urllib.",
        "__get__",
        "__next__",
        "__call__",
    ]

    def get_hook(self, fullname: str):
        if any(ignore in fullname for ignore in self.IGNORE_LIST):
            return None

        def analyze_for_none_returns(context: Union[FunctionSigContext, MethodSigContext]) -> Type:
            signature = context.default_signature
            if not isinstance(signature.ret_type, AnyType) or is_explicit_any(signature.ret_type):
                return signature
            return signature.copy_modified(ret_type=NoneType(), implicit=False)

        return analyze_for_none_returns

    def get_function_signature_hook(self, fullname: str):
        return self.get_hook(fullname)

    def get_method_signature_hook(self, fullname: str):
        return self.get_hook(fullname)


def plugin(version: str) -> type[RetNonePlugin]:
    return RetNonePlugin
