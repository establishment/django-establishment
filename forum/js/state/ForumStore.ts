import {Ajax} from "../../../../stemjs/base/Ajax";
import {NOOP_FUNCTION} from "../../../../stemjs/base/Utils";
import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {field} from "../../../../stemjs/state/StoreField";
import {type StoreEvent, type RawStoreObject} from "../../../../stemjs/state/State";
import {type StemDate} from "../../../../stemjs/time/Date";

import {PublicUser} from "../../../../csaaccounts/js/state/UserStore";
import {MessageThread, MessageInstance} from "../../../chat/js/state/MessageThreadStore";
import {GlobalState, type StoreId} from "../../../../stemjs/state/State";

@globalStore
export class Forum extends BaseStore("forum") {
    declare name: string;
    declare parentId?: StoreId;

    declare forumThreads: Map<StoreId, ForumThread>;

    // The fields above are the whole of what arrives; obj is the event's data, whoever built it
    constructor(obj: RawStoreObject, event?: StoreEvent) {
        super(obj, event);
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

    addForumThread(forumThread: ForumThread, event?: StoreEvent) {
        this.forumThreads.set(forumThread.id, forumThread);
        this.dispatch("newForumThread", event);
    }

    deleteForumThread(forumThread: ForumThread) {
        this.forumThreads.delete(forumThread.id);
        this.dispatch("deleteForumThread", forumThread);
    }
}


@globalStore
export class ForumThread extends BaseStore("forumthread", {dependencies: ["forum", "messageinstance"]}) {
    declare id: number;
    declare numViews: number;

    @field(PublicUser) author;
    @field(MessageInstance) contentMessage;
    declare hidden?: boolean;
    @field(Date) lastActive: StemDate;
    @field("MessageThread") messageThread: MessageThread;
    declare numMessages: number;
    @field(Forum) parent;
    declare pinnedIndex?: number;
    @field(Date) timeAdded: StemDate;
    declare title: string;
    declare votesBalance: number;

    constructor(obj: RawStoreObject) {
        super(obj);
        let parent = this.getParent();
        parent && parent.addForumThread(this);
    }

    getAuthor() {
        return this.author;
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
        return this.contentMessage;
    }

    getVotesBalance() {
        let message = this.getContentMessage();
        if (message) {
            return message.getVotesBalance();
        }
        return this.votesBalance;
    }

    getParent() {
        return this.parent;
    }

    getMessageThread() {
        return this.messageThread;
    }

    getTimeAdded(): StemDate {
        return this.timeAdded;
    }

    getLastActive(): StemDate {
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
