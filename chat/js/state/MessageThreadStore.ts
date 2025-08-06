import {Ajax} from "../../../../stemjs/src/base/Ajax";
import {GlobalState, StoreEvent, StoreId} from "../../../../stemjs/src/state/State";
import {NOOP_FUNCTION} from "../../../../stemjs/src/base/Utils";
import {BaseStore, coolStore} from "../../../../stemjs/src/state/Store";
import {VirtualObjectStoreMixin} from "../../../../stemjs/src/state/VirtualObjectStore";
import {StemDate} from "../../../../stemjs/src/time/Date";
import {ServerTime} from "../../../../stemjs/src/time/Time";

import {PublicUserStore} from "../../../../csaaccounts/js/state/UserStore";
import {UserReactionCollectionStore} from "../../../accounts/js/state/UserReactionStore";


@coolStore
export class MessageInstance extends VirtualObjectStoreMixin("MessageInstance") {
    static dependencies = ["messagethread", "publicuser"];

    declare content: string;
    declare timeAdded: number;
    declare userId: number;
    declare messageThreadId: number;
    declare reactionCollectionId?: number;
    declare temporaryId?: number;
    declare meta: any;
    declare postError?: any;

    constructor(obj: any, event: any) {
        super(obj, event);

        PublicUserStore.create(event.user);
    }

    getNormalizedId(): number {
        // TODO: Pretty bad implementation, works though
        let messageId = this.id + "";
        if (messageId.startsWith("temp-")) {
            messageId = messageId.substr(5);
        }
        return parseInt(messageId);
    }

    getDate(): number {
        return this.timeAdded;
    }

    getUser(): string {
        let user = PublicUserStore.get(this.userId);
        if (user) {
            return user.username;
        }
        return "user-" + this.userId;
    }

    getContent(): string {
        return this.content;
    }

    getMessageThread(): MessageThread | undefined {
        return MessageThreadStore.get(this.messageThreadId);
    }

    getReactionCollection(fakeIfMissing: boolean = false): any {
        let reactionCollection = UserReactionCollectionStore.get(this.reactionCollectionId);
        if (fakeIfMissing && !reactionCollection) {
            return {
                upvotesCount: 0,
                downvotesCount: 0,
                getCurrentUserReactionType() {},
            };
        }
        return reactionCollection;
    }

    getNumLikes(): number {
        return this.getReactionCollection(true).upvotesCount;
    }

    getNumDislikes(): number {
        return this.getReactionCollection(true).downvotesCount;
    }

    getVotesBalance(): number {
        return this.getNumLikes() - this.getNumDislikes();
    }

    getUserVote(): string | undefined {
        return this.getReactionCollection(true).getCurrentUserReactionType();
    }

    getPreviousMessage(): MessageInstance | null {
        // TODO: this should be cached and kept by the message thread
        let ans: MessageInstance | null = null;
        let currentId = this.getNormalizedId();
        // If message has temporary id, then it is identical with the previous message id, so instead the
        // previous previous message would be found instead.
        if (this.hasTemporaryId()) {
            currentId += 1;
        }
        for (let message of this.getMessageThread()!.getMessages()) {
            if (message.id < currentId && (!ans || ans.id < message.id)) {
                ans = message;
            }
        }
        return ans;
    }

    getNextMessage(): never {
        throw "Implement me!";
    }

    hasMarkupEnabled(): boolean {
        return this.getMessageThread()!.hasMarkupEnabled();
    }

    getTimeOfDay(): string {
        return StemDate.unix(this.timeAdded).format("HH:mm");
    }

    edit(content: string, onSuccess: () => void = NOOP_FUNCTION, onError: () => void = NOOP_FUNCTION): void {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            message: content,
        }).then(onSuccess, onError);
    }

    react(reaction: string, onSuccess: () => void = NOOP_FUNCTION, onError: () => void = NOOP_FUNCTION): void {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            reaction: reaction,
        }).then(onSuccess, onError);
    }

    like(onSuccess?: () => void, onError?: () => void): void {
        this.react("like", onSuccess, onError);
    }

    dislike(onSuccess?: () => void, onError?: () => void): void {
        this.react("dislike", onSuccess, onError);
    }

    resetReaction(onSuccess?: () => void, onError?: () => void): void {
        this.react("resetReaction", onSuccess, onError);
    }

    deleteMessage(onSuccess?: () => void, onError?: () => void): void {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            hidden: true,
        }).then(onSuccess, onError);
    }

    applyEvent(event: any): void {
        if (event.type === "messageEdit") {
            Object.assign(this, event.data);
            this.dispatch("edit", event);
        } else if (event.type === "reaction") {
            Object.assign(this, event.data);
            this.dispatch("reaction", event);
        } else if (event.type === "messageDelete") {
            this.dispatch("delete", event);
            this.getMessageThread()!.deleteMessageInstance(this);
        } else {
            super.applyEvent(event);
        }
    }

    updateId(newId: any): void {
        if (this.id == newId) {
            return;
        }
        let oldId = this.id;
        super.updateId(newId);
        let messageThread = this.getMessageThread()!;
        messageThread.messages.delete(oldId);
        messageThread.messages.set(this.id, this);
    }

    setPostError(postError: any): void {
        this.postError = postError;
        this.dispatch("postError", postError);
        console.log("Post error: ", postError);
    }

    static createVirtualMessageInstance(messageContent: string, messageThread: MessageThread, temporaryId: number): MessageInstance {
        let virtualMessageInstance = {
            content: messageContent,
            temporaryId: temporaryId,
            id: "temp-" + temporaryId,
            timeAdded: ServerTime.now().toUnix(),
            userId: parseInt(USER.id),
            messageThreadId: messageThread.id,
            meta: {},
        };

        return this.create(virtualMessageInstance, {isVirtual: true});
    }
}

export const MessageInstanceStore = MessageInstance;

MessageInstance.addCreateListener((messageInstance: MessageInstance, createEvent: any) => {
    messageInstance.getMessageThread()?.addMessageInstance(messageInstance, createEvent);
});


@coolStore
export class MessageThread extends BaseStore("MessageThread") {
    declare streamName: string;
    declare markupEnabled?: boolean;
    declare online: Set<StoreId>;
    declare messages: Map<StoreId, MessageInstance>;

    constructor(obj: any) {
        super(obj);
        this.messages = new Map();
        // TODO: don't change the global here, you fool!
        if (!this.streamName.startsWith("messagethread-privatechat-") && !this.streamName.startsWith("temp-")) {
            GlobalState.registerStream(this.streamName);
        }
        this.setOnlineUsers(this.online as any as StoreId[]);
    }

    setOnlineUsers(userIds?: StoreId[]) {
        this.online = new Set(userIds || []);
        this.online.delete(0);
        return this.online;
    }

    hasMarkupEnabled(): boolean {
        return this.markupEnabled || false;
    }

    addMessageInstance(messageInstance: MessageInstance, event: any): void {
        this.messages.set(messageInstance.id, messageInstance);
        this.dispatch("newMessage", event);
    }

    deleteMessageInstance(messageInstance: MessageInstance): void {
        this.messages.delete(messageInstance.id);
    }

    applyEvent(event: StoreEvent): void {
        if (event.data.online) {
            event.data.online = this.setOnlineUsers(event.data.online);
        }
        if (event.type === "online") {
            this.dispatch("usersChanged", event);
        } else if (event.type === "onlineDeltaJoined") {
            if (event.data.userId != 0) {
                this.online.add(event.data.userId);
            }

            this.dispatch("usersChanged", event);
        } else if (event.type === "onlineDeltaLeft") {
            if (event.data.userId != 0) {
                this.online.delete(event.data.userId);
            }

            this.dispatch("usersChanged", event);
        } else {
            super.applyEvent(event);
        }
    }

    getMessages(orderDescending: boolean = false): MessageInstance[] {
        // TODO: should be also as iterable
        let messages = Array.from(this.messages.values());
        if (orderDescending) {
            return messages.sort((a, b) => {return b.id - a.id});
        }
        return messages.sort((a, b) => {return a.id - b.id});
    }

    getNumMessages(): number {
        return this.messages.size;
    }

    getMaxMessageId(): number {
        let value = 0;
        for (let messageInstance of this.messages.values()) {
            if (!messageInstance.hasTemporaryId() && messageInstance.id as number > value) {
                value = messageInstance.id as number;
            }
        }
        return value;
    }

    // This method will return the last message of the message thread,
    // regardless of whether it is virtual or real.
    getLastMessage(): MessageInstance | null {
        let lastMessage: MessageInstance | null = null;
        for (let messageInstance of this.messages.values()) {
            if (!lastMessage || lastMessage.getNormalizedId() < messageInstance.getNormalizedId() ||
                    (lastMessage.getNormalizedId() === messageInstance.getNormalizedId() && messageInstance.hasTemporaryId())) {
                lastMessage = messageInstance;
            }
        }
        return lastMessage;
    }
}


export const MessageThreadStore = MessageThread;
