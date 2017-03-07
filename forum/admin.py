from django.contrib import admin
from django.core import urlresolvers

from establishment.forum.models import Forum, ForumThread


class ForumAdmin(admin.ModelAdmin):
    list_display = ('name', 'link_to_parent')
    search_fields = ('name',)
    raw_id_fields = ('parent',)

    def link_to_parent(self, obj):
        link = urlresolvers.reverse("admin:forum_forum_change", args=[obj.parent_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "Forum-" + str(obj.parent_id))
    link_to_parent.allow_tags = True


class ForumThreadAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'author', 'num_views', 'time_added', 'link_to_parent_forum', 'link_to_message_thread')
    list_filter = ('parent',)
    search_fields = ('title', 'author', 'parent',)
    raw_id_fields = ('author', 'parent', 'message_thread',)

    def link_to_parent_forum(self, obj):
        link = urlresolvers.reverse("admin:forum_forum_change", args=[obj.parent_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "Forum-" + str(obj.parent_id))
    link_to_parent_forum.allow_tags = True

    def link_to_message_thread(self, obj):
        link = urlresolvers.reverse("admin:chat_messagethread_change", args=[obj.message_thread_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "MessageThread-" + str(obj.message_thread_id))
    link_to_message_thread.allow_tags = True


admin.site.register(Forum, ForumAdmin)
admin.site.register(ForumThread, ForumThreadAdmin)
