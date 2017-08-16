import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";
import {AjaxFetchMixin, VirtualStoreObjectMixin, VirtualStoreMixin} from "StoreMixins";
import {PublicUserStore} from "UserStore";
import {UserReactionCollectionStore} from "UserReactionStore";
import {MarkupParser} from "MarkupParser";
import {ServerTime, StemDate} from "Time";
import {NOOP_FUNCTION} from "Utils";

class MessageInstance extends VirtualStoreObjectMixin(StoreObject) {
    constructor(obj, event) {
        super(obj, event);

        PublicUserStore.fakeCreate(event.user);
    }

    getNormalizedId() {
        // TODO: Pretty bad implementation, works though
        let messageId = this.id + "";
        if (messageId.startsWith("temp-")) {
            messageId = messageId.substr(5);
        }
        return parseInt(messageId);
    }

    getDate() {
        return this.timeAdded;
    }

    getUser() {
        let user = PublicUserStore.get(this.userId);
        if (user) {
            return user.username;
        }
        return "user-" + this.userId;
    }

    getContent() {
        return this.content;
    }

    getMessageThread() {
        return MessageThreadStore.get(this.messageThreadId);
    }

    getReactionCollection(fakeIfMissing=false) {
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

    getNumLikes() {
        return this.getReactionCollection(true).upvotesCount;
    }

    getNumDislikes() {
        return this.getReactionCollection(true).downvotesCount;
    }

    getVotesBalance() {
        return this.getNumLikes() - this.getNumDislikes();
    }

    getUserVote() {
        return this.getReactionCollection(true).getCurrentUserReactionType();
    }

    getPreviousMessage() {
        // TODO: this should be cached and kept by the message thread
        let ans = null;
        let currentId = this.getNormalizedId();
        // If message has temporary id, then it is identical with the previous message id, so instead the
        // previous previous message would be found instead.
        if (this.hasTemporaryId()) {
            currentId += 1;
        }
        for (let message of this.getMessageThread().getMessages()) {
            if (message.id < currentId && (!ans || ans.id < message.id)) {
                ans = message;
            }
        }
        return ans;
    }

    getNextMessage() {
        throw "Implement me!";
    }

    hasMarkupEnabled() {
        return this.getMessageThread().hasMarkupEnabled();
    }

    getTimeOfDay() {
        return StemDate.unix(this.timeAdded).format("HH:mm");
    }

    edit(content, onSuccess=NOOP_FUNCTION, onError=NOOP_FUNCTION) {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            message: content,
        }).then(onSuccess, onError);
    }

    react(reaction, onSuccess=NOOP_FUNCTION, onError=NOOP_FUNCTION) {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            reaction: reaction,
        }).then(onSuccess, onError);
    }

    like(onSuccess, onError) {
        this.react("like", onSuccess, onError);
    }

    dislike(onSuccess, onError) {
        this.react("dislike", onSuccess, onError);
    }

    resetReaction(onSuccess, onError) {
        this.react("resetReaction", onSuccess, onError);
    }

    deleteMessage(onSuccess, onError) {
        Ajax.postJSON("/chat/edit_message/", {
            messageId: this.id,
            hidden: true,
        }).then(onSuccess, onError);
    }

    applyEvent(event) {
        if (event.type === "messageEdit") {
            Object.assign(this, event.data);
            this.dispatch("edit", event);
        } else if (event.type === "reaction") {
            Object.assign(this, event.data);
            this.dispatch("reaction", event);
        } else if (event.type === "messageDelete") {
            this.dispatch("delete", event);
            this.getMessageThread().deleteMessageInstance(this);
        } else {
            super.applyEvent(event);
        }
    }

    updateId(newId) {
        if (this.id == newId) {
            return;
        }
        let oldId = this.id;
        super.updateId(newId);
        let messageThread = this.getMessageThread();
        messageThread.messages.delete(oldId);
        messageThread.messages.set(this.id, this);
    }

    setPostError(postError) {
        this.postError = postError;
        this.dispatch("postError", postError);
        console.log("Post error: ", postError);
    }
}

class MessageThread extends StoreObject {
    constructor(obj) {
        super(obj);
        this.messages = new Map();
        // TODO: for now don't register for private chats, you get them as user events
        // TODO: don't change the global here, you fool!
        if (!this.streamName.startsWith("messagethread-privatechat-")) {
            GlobalState.registerStream(this.streamName);
        }
        this.online = new Set(this.online || []);
        this.online.delete(0);
    }

    hasMarkupEnabled() {
        return this.markupEnabled || false;
    }

    addMessageInstance(messageInstance, event) {
        this.messages.set(messageInstance.id, messageInstance);
        this.dispatch("newMessage", event);
    }

    deleteMessageInstance(messageInstance) {
        this.messages.delete(messageInstance.id);
    }

    applyEvent(event) {
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

    getMessages(orderDescending=false) {
        // TODO: should be also as iterable
        let messages = Array.from(this.messages.values());
        if (orderDescending) {
            return messages.sort((a, b) => {return b.id - a.id});
        }
        return messages.sort((a, b) => {return a.id - b.id});
    }

    getNumMessages() {
        return this.messages.size;
    }

    getMaxMessageId() {
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
    getLastMessage() {
        let lastMessage = null;
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

    createVirtualMessageInstance(messageContent, messageThread, temporaryId) {
        let virtualMessageInstance = {
            content: messageContent,
            temporaryId: temporaryId,
            id: "temp-" + temporaryId,
            timeAdded: ServerTime.now().toUnix(),
            userId: parseInt(USER.id),
            messageThreadId: messageThread.id,
            meta: {},
        };

        return this.fakeCreate(virtualMessageInstance, "virtualMessage");
    };
}

var MessageInstanceStore = new MessageInstanceStoreClass();

MessageInstanceStore.addCreateListener((messageInstance, createEvent) => {
    messageInstance.getMessageThread().addMessageInstance(messageInstance, createEvent);
});


var MessageThreadStore = new GenericObjectStore("messagethread", MessageThread);

class BaseChatObject extends StoreObject {
    getMessageThread() {
        return MessageThreadStore.get(this.messageThreadId);
    }

    getOnlineUserIds() {
        return this.getMessageThread().online;
    }
}

class GroupChat extends BaseChatObject {
}

var GroupChatStoreClass = AjaxFetchMixin(GenericObjectStore);

var GroupChatStore = new GroupChatStoreClass("groupChat", GroupChat, {
    fetchURL: "/chat/group_chat_state/",
    maxFetchObjectCount: 1,
});

GroupChatStore.getFetchRequestData = function (ids, fetchJobs) {
    return {
        chatId: ids[0],
    };
};

class PrivateChat extends BaseChatObject {
    getOtherUserId() {
        return (USER.id === this.user1Id ? this.user2Id : this.user1Id);
    }
}

var PrivateChatStore = new GenericObjectStore("PrivateChat", PrivateChat, {
});

PrivateChatStore.getChatWithUser = function(userId) {
    let myUserId = USER.id;
    if (myUserId === userId) {
        for (let privateChat of this.all()) {
            if (privateChat.user1Id === userId && privateChat.user2Id === userId) {
                return privateChat;
            }
        }
        return null;
    }
    for (let privateChat of this.all()) {
        if (privateChat.user1Id === userId || privateChat.user2Id === userId) {
            return privateChat;
        }
    }
};

PrivateChatStore.fetchForUser = function (userId, onSuccess, onError) {
    Ajax.postJSON("/chat/private_chat_state/", {
        userId: userId,
    }).then(
        (data) => onSuccess(PrivateChatStore.get(data.privateChatId)),
        onError
    );
};

PrivateChatStore.addListener("update", (obj, event) => {
    if (event.type === "privateMessage") {
        GlobalState.importState(event.state);
    }
});

export {MessageInstance, MessageInstanceStore, MessageThread, MessageThreadStore, PrivateChatStore, GroupChatStore};
