from __future__ import annotations

from contextlib import AbstractContextManager, ExitStack
from contextvars import ContextVar
from types import TracebackType
from typing import Optional, Generic, TypeVar

# This file provides pure python helpers for missing functionality from the
# contextlib/contextvars standard library modules.
#
# The gist of it is that Python context managers are not composable out of the box, and the contextvars library
# does not operate nicely with contextlib. These utilities help with that.
#
# TODO: Maybe propose some of this stuff to Python standard library?


# A context manager that does nothing. Useful for functions that return context managers, that need to branch.
# An example is:
#
#   def permission_filter_for(merchant: Optional[Merchant]):
#     if merchant is not None:
#       return PermissionFilter(merchant)
#     else:
#       return NoopContextManager()  # There is nothing to return here!
#
# Now we can use this function safely in a `with` statement:
#   merchant = Merchant.objects.get(id=merchant_id) if merchant_id else None
#   with permission_filter_for(merchant):
#     do_work()
class NoopContextManager(AbstractContextManager):
    def __enter__(self) -> NoopContextManager:
        return self

    def __exit__(self,
                 exc_type: Optional[type[BaseException]],
                 exc_value: Optional[BaseException],
                 traceback: Optional[TracebackType]):
        pass


# A context manager used to chain multiple context managers.
# Writing:
#
#   with ChainContextManager([permission_filter, transaction.atomic()]):
#     do_work()
#
# Is equivalent to writing:
#
#   with permission_filter:
#     with transaction.atomic():
#       do_work()
#
# The main advantage is you can compose multiple context managers into one, so they can be properly
# returned from a function.
class ChainContextManager(AbstractContextManager):
    def __init__(self, context_managers: list[AbstractContextManager]):
        self.context_managers = context_managers
        # The exit stack works exactly like it says it does: as a stack of contexts.
        # After __enter__-ing the context_stack, calling context_stack.enter_context(context) enters said
        # context and adds it in the stack. When __exit__-ing the context_stack, all registered contexts
        # are exited in reverse order. Writing this by hand is tricky because of possible exceptions when
        # entering nested contexts (in which case the earlier ones must be exited), and the standard
        # library's implementation of ExitStack does "the right thing".
        self.context_stack = ExitStack()

    def __enter__(self) -> ChainContextManager:
        self.context_stack.__enter__()
        for manager in self.context_managers:
            self.context_stack.enter_context(manager)
        return self

    def __exit__(self,
                 exc_type: Optional[type[BaseException]],
                 exc_value: Optional[BaseException],
                 traceback: Optional[TracebackType]):
        return self.context_stack.__exit__(exc_type, exc_value, traceback)


T = TypeVar("T")


# A ContextVar[T] (part of the contextvars library) is a thread-safe, async-safe variable available
# in the current execution context. You can think of it as a local variable that is available in
# nested function calls without needing to be passed as a parameter through 50 functions.
# This context manager makes it easy to set a context var to a value using a ContextManager.
#
#   # Somewhere global
#   current_task_context: ContextVar[Optional[TaskContext]] = ContextVar("current_task_context", default=None)
#
#   # Somewhere local:
#   with ContextVarContextManager(current_task_context, TaskContext()):
#     do_work()
#
#   # inside do_work(), or far nested into the call stack:
#   task_context = current_task_context.get()
#
# When this context manager exits, the value of current_task_context is reset to its previous value.
class ContextVarContextManager(AbstractContextManager, Generic[T]):
    def __init__(self, var: ContextVar[T], value: T):
        self.var = var
        self.value = value

    def __enter__(self) -> ContextVarContextManager[T]:
        # When setting the value of the context var, the return value is similar to how Stem
        # returns a DispatcherHandle from Dispatcher.addListener(): it provides a way to cleanup
        # the value.
        self.reset_token = self.var.set(self.value)
        return self

    def __exit__(self,
                 exc_type: Optional[type[BaseException]],
                 exc_value: Optional[BaseException],
                 traceback: Optional[TracebackType]):
        # Use the reset_token from __enter__ to reset the context variable back to its previous value.
        self.var.reset(self.reset_token)
