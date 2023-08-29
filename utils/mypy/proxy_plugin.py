from typing import Optional, Callable

from mypy.nodes import TypeInfo
from mypy.options import Options
from mypy.plugin import Plugin, ClassDefContext
from mypy.types import Instance

PROXY_OBJECT_FULLNAME = "utils.proxy.ProxyObject"


def analyze_proxy_subclass(context: ClassDefContext):
    # First, try to find the ProxyObject class in the bases of
    # the currently analyzed classes.
    bases: list[Instance] = context.cls.info.bases
    proxy_index = None
    for i, base in enumerate(bases):
        if base.type.fullname == PROXY_OBJECT_FULLNAME:
            proxy_index = i
            break
    if proxy_index is None:
        # If this object is not a subclass of proxy, we are
        # not interested in it.
        return

    # If found, add the proxy's wrapped class to the list of bases
    # right after the proxy class itself.
    proxy_wrapped_class = bases[proxy_index].args[0]
    context.cls.info.bases = bases[:proxy_index + 1] + [proxy_wrapped_class] + bases[proxy_index + 1:]  # type: ignore

    # Update the class' MRO sequence in the same way as well
    new_mro_class = proxy_wrapped_class.type  # type: ignore
    mro = context.cls.info.mro
    for index, cls in enumerate(mro):
        if cls.fullname == PROXY_OBJECT_FULLNAME:
            context.cls.info.mro = mro[:index + 1] + [new_mro_class] + mro[index + 1:]
            break
    else:
        raise Exception(f"Class {context.cls.fullname} has a ProxyObject base, but does not have "
                        f"a ProxyObject in the MRO sequence.")

    # If this is not the final iteration of semantic analysis,
    # request another iteration. This is to make sure that the
    # Django & Pydantic plugins can do their thing with this
    # class as well.
    if not context.api.final_iteration:
        context.api.defer()


class ProxyPlugin(Plugin):
    def __init__(self, options: Options):
        super().__init__(options)
        self._analyzed_classes: set[str] = {PROXY_OBJECT_FULLNAME}

    def get_base_class_hook(self, fullname: str) -> Optional[Callable[[ClassDefContext], None]]:
        # Only analyze each class once. mypy documentation states that
        # hooks should be idempotent, but since we leave no marker on
        # a class that we already processed it (we could do that as well
        # if necessary), this is our way to achieve idempotence. This is
        # safe since at the point when this hook is called, the base
        # classes of a type are already analyzed so everything we use in
        # the hook is there on the first call.
        if fullname not in self._analyzed_classes:
            sym = self.lookup_fully_qualified(fullname)
            if sym and isinstance(sym.node, TypeInfo):
                self._analyzed_classes.add(fullname)
                if any(base.fullname == PROXY_OBJECT_FULLNAME for base in sym.node.mro):
                    return analyze_proxy_subclass
        return None


# Note: This plugin should be installed before the Django and Pydantic plugins,
# so proxies of Django/Pydantic classes can also have the Django and Pydantic
# functionalities analyzed.
def plugin(version: str):
    return ProxyPlugin
