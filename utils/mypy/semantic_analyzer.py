from mypy.nodes import FuncDef, ClassDef, Decorator, ArgKind
from mypy.semanal import SemanticAnalyzer
from mypy.semanal_shared import set_callable_name
from mypy.types import NoneType, CallableType, TypeType
from mypy.typevars import fill_typevars


# The code in here is similar to the add_method_to_class() function in mypy/plugins/common.py,
# especially the instantiation of CallableType.
class SemanticAnalyzerWithAutoNoneReturns(SemanticAnalyzer):
    def apply_class_plugin_hooks(self, defn: ClassDef):
        super().apply_class_plugin_hooks(defn)

        for name, method in defn.info.names.items():

            # Debugging hint: this is a good place to set a PyCharm conditional breakpoint with the
            # condition like "name == 'close'" if mypy complains about a close() method on a class.

            if not isinstance(method.node, (FuncDef, Decorator)):
                continue

            func = method.node.func if isinstance(method.node, Decorator) else method.node
            if method.node.type is not None or func.type is not None:
                continue

            # Mypy couldn't create a type annotation for this method.
            # If the method takes no parameters except self, we create
            # the type for mypy, to say it returns None.

            is_property = isinstance(method.node, Decorator) \
                          and any(getattr(decorator, "fullname", None) == "builtins.property"
                                  for decorator in method.node.original_decorators)
            if is_property:
                # A property should always have a return type annotation, mypy will
                # emit a "no-untyped-def" error, so just ignore it.
                continue

            is_class_method = isinstance(method.node, Decorator) \
                              and any(getattr(decorator, "fullname", None) == "builtins.classmethod"
                                      for decorator in method.node.original_decorators)

            is_static_method = isinstance(method.node, Decorator) \
                               and any(getattr(decorator, "fullname", None) == "builtins.staticmethod"
                                       for decorator in method.node.original_decorators)

            if is_static_method:
                if len(func.arg_names) == 0 and len(func.arg_kinds) == 0:
                    signature = CallableType([], [], [], NoneType(), self.named_type("builtins.function"))
                    func.type = set_callable_name(signature, func)
            elif is_class_method:
                if len(func.arg_names) == 1 and func.arg_names[0] == "cls" \
                        and len(func.arg_kinds) == 1 and func.arg_kinds[0] == ArgKind.ARG_POS:
                    signature = CallableType([TypeType.make_normalized(fill_typevars(defn.info))],
                                             func.arg_kinds,
                                             func.arg_names,
                                             NoneType(),
                                             self.named_type("builtins.function"))
                    func.type = set_callable_name(signature, func)
            else:
                if len(func.arg_names) == 1 and func.arg_names[0] == "self" \
                        and len(func.arg_kinds) == 1 and func.arg_kinds[0] == ArgKind.ARG_POS:
                    signature = CallableType([fill_typevars(defn.info)],
                                             func.arg_kinds,
                                             func.arg_names,
                                             NoneType(),
                                             self.named_type("builtins.function"))
                    func.type = set_callable_name(signature, func)
