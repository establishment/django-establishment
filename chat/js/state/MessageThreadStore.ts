import {Ajax} from "../../../../stemjs/src/base/Ajax";
import {GlobalState, StoreId} from "../../../../stemjs/src/state/State";
import {NOOP_FUNCTION} from "../../../../stemjs/src/base/Utils";
import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";
import {AjaxFetchMixin, VirtualStoreObjectMixin, VirtualStoreMixin, FetchJob, FetchRequestData} from "../../../../stemjs/src/state/StoreMixins";
import {StemDate} from "../../../../stemjs/src/time/Date";
import {ServerTime} from "../../../../stemjs/src/time/Time";

import {PublicUserStore} from "../../../../csaaccounts/js/state/UserStore";
import {UserReactionCollectionStore} from "../../../accounts/js/state/UserReactionStore";


export class MessageInstance extends VirtualStoreObjectMixin(StoreObject) {
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
}

export class MessageThread extends StoreObject {
    declare streamName: string;
    declare markupEnabled?: boolean;
    declare online: Set<number>;
    declare messages: Map<any, MessageInstance>;

    constructor(obj: any) {
        super(obj);
        this.messages = new Map();
        // TODO: don't change the global here, you fool!
        if (!this.streamName.startsWith("messagethread-privatechat-") && !this.streamName.startsWith("temp-")) {
            GlobalState.registerStream(this.streamName);
        }
        this.online = new Set(this.online || []);
        this.online.delete(0);
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

    applyEvent(event: any): void {
        if (event.data.online) {
            this.online = event.data.online = new Set(event.data.online);
            this.online.delete(0);
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
            if (!messageInstance.hasTemporaryId() && messageInstance.id > value) {
                value = messageInstance.id;
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

class MessageInstanceStoreClass extends VirtualStoreMixin(GenericObjectStore) {
    constructor() {
        super("MessageInstance", MessageInstance, {dependencies: ["messagethread", "publicuser"]});
    }

    createVirtualMessageInstance(messageContent: string, messageThread: MessageThread, temporaryId: number): MessageInstance {
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

export const MessageInstanceStore = new MessageInstanceStoreClass();

MessageInstanceStore.addCreateListener((messageInstance: MessageInstance, createEvent: any) => {
    messageInstance.getMessageThread()?.addMessageInstance(messageInstance, createEvent);
});


export const MessageThreadStore = new GenericObjectStore("messagethread", MessageThread);

class BaseChatObject extends StoreObject {
    declare messageThreadId: number;

    getMessageThread(): MessageThread | undefined {
        return MessageThreadStore.get(this.messageThreadId);
    }

    getOnlineUserIds(): Set<number> | undefined {
        return this.getMessageThread()?.online;
    }
}

class GroupChat extends BaseChatObject {
}

class GroupChatStoreClass extends AjaxFetchMixin(GenericObjectStore<GroupChat>) {
    getFetchRequestData(entries: [StoreId, FetchJob[]][]) {
        return {
            chatId: entries.map(entry => entry[0])[0],
        };
    }
}

export const GroupChatStore = new GroupChatStoreClass("groupChat", GroupChat, {
    fetchURL: "/chat/group_chat_state/",
    maxFetchObjectCount: 1,
});

class PrivateChat extends BaseChatObject {
    declare user1Id: number;
    declare user2Id: number;

    getOtherUserId(): number {
        return (USER.id === this.user1Id ? this.user2Id : this.user1Id);
    }
}

export const PrivateChatStore = new GenericObjectStore<PrivateChat>("PrivateChat", PrivateChat, {
});

PrivateChatStore.getChatWithUser = function(userId: number): PrivateChat | null {
    let myUserId = USER.id;
    if (myUserId === userId) {
        for (let privateChat of this.all()) {
            if (privateChat.user1Id === userId && privateChat.user2Id === userId) {
                return privateChat;
            }
        }
        return null;
    }
    for (const privateChat of this.all()) {
        if (privateChat.user1Id === userId || privateChat.user2Id === userId) {
            return privateChat;
        }
    }
    return null;
};

PrivateChatStore.fetchForUser = function (userId: number, onSuccess: (chat: PrivateChat) => void, onError: (error: any) => void): void {
    Ajax.postJSON("/chat/private_chat_state/", {
        userId: userId,
    }).then(
        (data: any) => onSuccess(PrivateChatStore.get(data.privateChatId)),
        onError
    );
};

PrivateChatStore.addChangeListener((obj: any, event: any) => {
    if (event.type === "privateMessage") {
        GlobalState.importState(event.state);
    }
});
