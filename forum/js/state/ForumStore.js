import {Ajax} from "../../../../stemjs/base/Ajax.js";
import {NOOP_FUNCTION} from "../../../../stemjs/base/Utils.js";
import {globalStore, BaseStore} from "../../../../stemjs/state/Store";

import {PublicUser} from "../../../../csaaccounts/js/state/UserStore";
import {MessageThread, MessageInstance} from "../../../chat/js/state/MessageThreadStore.js";
import {GlobalState} from "../../../../stemjs/state/State.js";

@globalStore
export class Forum extends BaseStore("forum") {
    constructor() {
        super(...arguments);
        this.forumThreads = new Map();
        // TODO: not appropriate to register to streams here
        GlobalState.registerStream(this.getStreamName());
        ForumThread.addDeleteListener((forumThread) => {
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


@globalStore
export class ForumThread extends BaseStore("forumthread", {dependencies: ["forum", "messageinstance"]}) {
    constructor(obj) {
        super(obj);
        let parent = this.getParent();
        parent && parent.addForumThread(this);
    }

    getAuthor() {
        return PublicUser.get(this.authorId);
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
        return MessageInstance.get(this.contentMessageId);
    }

    getVotesBalance() {
        let message = this.getContentMessage();
        if (message) {
            return message.getVotesBalance();
        }
        return this.votesBalance;
    }

    getParent() {
        return Forum.get(this.parentId);
    }

    getMessageThread() {
        return MessageThread.get(this.messageThreadId);
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
