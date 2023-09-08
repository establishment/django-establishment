from __future__ import annotations

from contextlib import AbstractContextManager

from establishment.utils.context_lib import NoopContextManager, ChainContextManager


class Permission:
    name: str = "Permission"

    def __str__(self) -> str:
        return self.name

    def __and__(self, other: Permission) -> PermissionSet:
        return PermissionSet(self.sub_permissions() + other.sub_permissions())

    def sub_permissions(self) -> list[Permission]:
        return [self]

    def contains_permission(self, permission_class: type[Permission]) -> bool:
        for sub_perm in self.sub_permissions():
            if isinstance(sub_perm, permission_class):
                return True
        return False

    # This method should raise an appropriate exception for the type of permission error.
    def check_permission(self):
        raise NotImplementedError

    def get_permission_filter(self) -> AbstractContextManager:
        return NoopContextManager()


class PermissionSet(Permission):
    name = "PermissionSet"

    def __init__(self, permissions: list[Permission]):
        self.permissions = permissions

    def __str__(self) -> str:
        return "&".join([str(p) for p in self.permissions])

    def sub_permissions(self) -> list[Permission]:
        return self.permissions

    def check_permission(self):
        for permission in self.permissions:
            permission.check_permission()

    def get_permission_filter(self) -> AbstractContextManager:
        return ChainContextManager([permission.get_permission_filter() for permission in self.permissions])


class AllowAny(Permission):
    name = "AllowAny"

    def check_permission(self):
        pass


allow_any = AllowAny()
