from mypy.checker import TypeChecker
from mypy.nodes import FuncItem
from mypy.types import CallableType, ProperType, AnyType, TypeOfAny, NoneType, Type


# Suppress the mypy error about:
# error: Function is missing a return type annotation  [no-untyped-def]
class TypeCheckerWithAutoNoneReturns(TypeChecker):
    # Look at the check_for_missing_annotations() method in TypeChecker for
    # similar code. If it doesn't look similar after a mypy upgrade, it should be.
    def check_for_missing_annotations(self, fdef: FuncItem):
        def is_unannotated_any(t: Type) -> bool:
            if not isinstance(t, ProperType):
                return False
            return isinstance(t, AnyType) and t.type_of_any == TypeOfAny.unannotated

        if "site-packages" not in self.path \
                and isinstance(fdef.type, CallableType) \
                and is_unannotated_any(fdef.type.ret_type):
            fdef.type = fdef.type.copy_modified(ret_type=NoneType(), implicit=False)

        super().check_for_missing_annotations(fdef)
