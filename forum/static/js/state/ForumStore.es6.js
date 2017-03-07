import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";
import {MessageThreadStore, MessageInstanceStore} from "MessageThreadStore";
import {PublicUserStore} from "UserStore";


class Forum extends StoreObject {
    constructor(obj) {
        super(obj);
        this.forumThreads = new Map();
        // GlobalState.registerStream("forum-" + this.id);
        ForumThreadStore.addDeleteListener((forumThread) => {
            if (forumThread.parentId === this.id && this.forumThreads.has(forumThread.id)) {
                this.deleteForumThread(forumThread);
            }
        });
    }

    getForumThreads() {
        let forumThreads = Array.from(this.forumThreads.values());
        // Filter out hidden forum threads
        forumThreads = forumThreads.filter(forumThread => forumThread.isVisible());
        forumThreads.sort((a, b) => {return b.id - a.id});
        return forumThreads;
    }

    addForumThread(forumThread, event) {
        this.forumThreads.set(forumThread.id, forumThread);
        this.dispatch("newForumThread", event);
    }

    deleteForumThread(forumThread) {
        this.forumThreads.delete(forumThread.id);
        this.dispatch("deleteForumThread", forumThread);
    }
}

var ForumStore = new GenericObjectStore("forum", Forum);

class ForumThread extends StoreObject {
    constructor(obj) {
        super(obj);
        let parent = this.getParent();
        parent.addForumThread(this);
    }

    getAuthor() {
        return PublicUserStore.get(this.authorId);
    }

    isPinned() {
        return this.pinnedIndex != null;
    }

    getPinIndex() {
        return this.pinnedIndex;
    }

    getTitle() {
        return this.title;
    }

    getContentMessage() {
        return MessageInstanceStore.get(this.contentMessageId);
    }

    getVotesBalance() {
        let message = this.getContentMessage();
        if (message) {
            return message.getVotesBalance();
        }
        return this.votesBalance;
    }

    getParent() {
        return ForumStore.get(this.parentId);
    }

    getMessageThread() {
        return MessageThreadStore.get(this.messageThreadId);
    }

    getTimeAdded() {
        // TODO: maybe return formatted time
        return this.timeAdded;
    }

    getLastActive() {
        return this.lastActive;
    }

    getNumReplies() {
        return this.getNumMessages() - 1;
    }

    deleteThread(onSuccess, onError) {
        let request = {
            forumThreadId: this.id,
            hidden: true,
        };

        Ajax.request({
            url: "/forum/edit_forum_thread/",
            type: "POST",
            dataType: "json",
            data: request,
            success: (data) => {
                if (onSuccess) {
                    onSuccess(data);
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error in sending delete message:\n" + xhr.status + ":\n" + xhr.responseText);
                if (onError) {
                    onError(xhr, errmsg, err);
                }
            }
        });
    }

    getNumMessages() {
        let messageThreadNumMessages;
        if (this.getMessageThread()) {
            messageThreadNumMessages = this.getMessageThread().getNumMessages();
        }
        return messageThreadNumMessages || this.numMessages;
    }

    isVisible() {
        return !this.hidden;
    }

    isLoaded() {
        return this.getMessageThread() != null;
    }
}

var ForumThreadStore = new GenericObjectStore("forumthread", ForumThread, {
    dependencies: ["forum", "messageinstance"]
});

ForumThreadStore.addCreateListener((forumThread, createEvent) => {
    forumThread.getParent().addForumThread(forumThread, createEvent);
});


export {ForumStore, ForumThreadStore};
