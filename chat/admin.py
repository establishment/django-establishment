from django.contrib import admin
from django.core import urlresolvers

from establishment.accounts.utils import get_user_search_fields
from establishment.chat.models import *


class MessageInstanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'link_to_message_thread', 'content')
    list_filter = ('hidden',)
    search_fields = []
    raw_id_fields = ('message_thread',)

    def link_to_message_thread(self, obj):
        link = urlresolvers.reverse("admin:chat_messagethread_change", args=[obj.message_thread_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "MessageThread-" + str(obj.message_thread_id))
    link_to_message_thread.allow_tags = True

    def get_search_fields(self, request):
        return ["content"] + ["user__" + attr for attr in get_user_search_fields()]

admin.site.register(MessageThread)
admin.site.register(MessageInstance, MessageInstanceAdmin)
admin.site.register(PrivateChat)
admin.site.register(GroupChat)
