from django.contrib import admin
from django.core import urlresolvers

from .models import Follower


class FollowerAdmin(admin.ModelAdmin):
    raw_id_fields = ("user", "target")


admin.site.register(Follower, FollowerAdmin)
