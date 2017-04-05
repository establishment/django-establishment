from django.contrib import admin
from django.core import urlresolvers

from establishment.chat.models import *


class MessageInstanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'link_to_message_thread', 'content', "link_to_reaction_collection")
    list_filter = ('hidden',)
    search_fields = ('user', 'content',)
    raw_id_fields = ('message_thread',)

    def link_to_message_thread(self, obj):
        link = urlresolvers.reverse("admin:chat_messagethread_change", args=[obj.message_thread_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "MessageThread-" + str(obj.message_thread_id))
    link_to_message_thread.allow_tags = True
    
    def link_to_reaction_collection(self, obj):
        link = urlresolvers.reverse("admin:accounts_userreactioncollection_change", args=[obj.reaction_collection_id]) #model name has to be lowercase
        return u'<a href="%s">%s</a>' % (link, "UserReactionCollection-" + str(obj.reaction_collection_id))
    link_to_reaction_collection.allow_tags = True

admin.site.register(MessageThread)
admin.site.register(MessageInstance, MessageInstanceAdmin)
admin.site.register(PrivateChat)
admin.site.register(GroupChat)
