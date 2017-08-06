import os

import time
from functools import lru_cache

from django.conf import settings

from django.views import static as static_view

from establishment.misc.util import import_module_attribute

old_staticfiles_serve = static_view.serve


@lru_cache()
def get_static_file_watchers():
    static_file_watchers = []

    for watcher_class, options in getattr(settings, "STATIC_FILE_WATCHERS", []):
        watcher_class = import_module_attribute(watcher_class)
        static_file_watchers.append(watcher_class(**(options or {})))

    return static_file_watchers


def static_serve(request, static_path, document_root=None, **kwargs):
    have_announced_waiting = False
    file_path = os.path.join(document_root, static_path)

    for file_watcher in get_static_file_watchers():
        if not file_watcher.is_ready(file_path):
            if not have_announced_waiting:
                print("Waiting on process generating %s" % file_path)
                have_announced_waiting = True
            time.sleep(0.1)

    return old_staticfiles_serve(request, static_path, document_root=document_root, **kwargs)


def patch_static_serve():
    """
    Changes the basic Django file server to instantiate classes from the setting STATIC_FILE_WATCHER.
    The settings value must be an interable with a tuple of a class location and instantiation options
    Each class instance must implement a method `is_ready(file_name)`, saying if the file can be served or not.
    """
    if settings.DEBUG:
        static_view.serve = static_serve
