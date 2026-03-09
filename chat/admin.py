from django.contrib import admin
from django import urls
from django.utils.html import format_html

from establishment.chat.models import *


class MessageInstanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'link_to_message_thread', 'content', "link_to_reaction_collection")
    list_filter = ('hidden',)
    search_fields = ('user', 'content',)
    raw_id_fields = ('message_thread',)

    def link_to_message_thread(self, obj):
        link = urls.reverse("admin:chat_messagethread_change", args=[obj.message_thread_id]) #model name has to be lowercase
        return format_html('<a href="{}">MessageThread-{}</a>', link, obj.message_thread_id)

    def link_to_reaction_collection(self, obj):
        link = urls.reverse("admin:accounts_userreactioncollection_change", args=[obj.reaction_collection_id]) #model name has to be lowercase
        return format_html('<a href="{}">UserReactionCollection-{}</a>', link, obj.reaction_collection_id)

admin.site.register(MessageThread)
admin.site.register(MessageInstance, MessageInstanceAdmin)
admin.site.register(PrivateChat)
admin.site.register(GroupChat)
