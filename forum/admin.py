from django.contrib import admin
from django import urls
from django.utils.html import format_html

from establishment.forum.models import Forum, ForumThread


class ForumAdmin(admin.ModelAdmin):
    list_display = ('name', 'link_to_parent')
    search_fields = ('name',)
    raw_id_fields = ('parent',)

    def link_to_parent(self, obj):
        link = urls.reverse("admin:forum_forum_change", args=[obj.parent_id]) #model name has to be lowercase
        return format_html('<a href="{}">Forum-{}</a>', link, obj.parent_id)


class ForumThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'num_views', 'time_added', 'link_to_parent_forum', 'link_to_message_thread')
    list_filter = ('parent',)
    search_fields = ('title', 'author', 'parent',)
    raw_id_fields = ('author', 'parent', 'message_thread',)

    def link_to_parent_forum(self, obj):
        link = urls.reverse("admin:forum_forum_change", args=[obj.parent_id]) #model name has to be lowercase
        return format_html('<a href="{}">Forum-{}</a>', link, obj.parent_id)

    def link_to_message_thread(self, obj):
        link = urls.reverse("admin:chat_messagethread_change", args=[obj.message_thread_id]) #model name has to be lowercase
        return format_html('<a href="{}">MessageThread-{}</a>', link, obj.message_thread_id)


admin.site.register(Forum, ForumAdmin)
admin.site.register(ForumThread, ForumThreadAdmin)
