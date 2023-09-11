from django.apps import apps

from establishment.utils.db.permission_filter import PermissionFilterMixin, PermissionFilterManager, \
    PermissionFilterSoftDeletionMixin, PermissionFilterSoftDeletionManager
from establishment.utils.db.soft_deletion import SoftDeletionMixin, SoftDeletionManager


# TODO @Mihai @Darius What? Can't we implement this without a patch?
def patch_model_managers() -> None:
    for model in apps.get_models():
        if issubclass(model, PermissionFilterMixin):
            model._meta.local_managers = []
            PermissionFilterManager(filtered_only=True).contribute_to_class(model, "objects")
            PermissionFilterManager(filtered_only=False).contribute_to_class(model, "unfiltered_objects")
        elif issubclass(model, PermissionFilterSoftDeletionMixin):
            model._meta.local_managers = []
            PermissionFilterSoftDeletionManager(alive_only=True, filtered_only=True).contribute_to_class(model, "objects")
            PermissionFilterSoftDeletionManager(alive_only=False, filtered_only=True).contribute_to_class(model, "all_objects")
            PermissionFilterSoftDeletionManager(alive_only=True, filtered_only=False).contribute_to_class(model, "unfiltered_objects")
            PermissionFilterSoftDeletionManager(alive_only=False, filtered_only=False).contribute_to_class(model, "all_unfiltered_objects")
        elif issubclass(model, SoftDeletionMixin):
            model._meta.local_managers = []
            SoftDeletionManager(alive_only=True).contribute_to_class(model, "objects")
            SoftDeletionManager(alive_only=False).contribute_to_class(model, "all_objects")
