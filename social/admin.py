from django.contrib import admin

from .models import Follower


class FollowerAdmin(admin.ModelAdmin):
    raw_id_fields = ("user", "target")


admin.site.register(Follower, FollowerAdmin)
