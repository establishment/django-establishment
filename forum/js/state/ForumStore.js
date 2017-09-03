import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";
import {MessageThreadStore, MessageInstanceStore} from "MessageThreadStore";
import {PublicUserStore} from "UserStore";
import {Ajax} from "Ajax";
import {NOOP_FUNCTION} from "Utils";

class Forum extends StoreObject {
    constructor() {
        super(...arguments);
        this.forumThreads = new Map();
        // TODO: not appropriate to register to streams here
        this.registerToStream();
        ForumThreadStore.addDeleteListener((forumThread) => {
            if (forumThread.parentId === this.id && this.forumThreads.has(forumThread.id)) {
                this.deleteForumThread(forumThread);
            }
        });
    }

    getStreamName() {
        return "forum-" + this.id;
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
        parent && parent.addForumThread(this);
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

    deleteThread(onSuccess=NOOP_FUNCTION, onError=NOOP_FUNCTION) {
        Ajax.postJSON("/forum/edit_forum_thread/", {
            forumThreadId: this.id,
            hidden: true,
        }).then(onSuccess, onError);
    }

    getNumMessages() {
        return this.numMessages;
    }

    isVisible() {
        return !this.hidden;
    }

    isLoaded() {
        // TODO: this needs to be fixed to support dynamic loading
        // console.warn(this.getNumReplies(), this.getMessageThread().getNumMessages());
        return this.getMessageThread() != null && this.getNumReplies() === this.getMessageThread().getNumMessages() - 1;
    }
}

const ForumThreadStore = new GenericObjectStore("forumthread", ForumThread, {
    dependencies: ["forum", "messageinstance"]
});


export {ForumStore, ForumThreadStore};