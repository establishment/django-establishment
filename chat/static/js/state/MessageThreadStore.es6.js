import {Ajax} from "Ajax";
import {GlobalState} from "State";
import {StoreObject, GenericObjectStore} from "Store";
import {AjaxFetchMixin, VirtualStoreObjectMixin, VirtualStoreMixin} from "StoreMixins";
import {PublicUserStore} from "UserStore";
import {UserReactionCollectionStore} from "UserReactionStore";
import {MarkupParser} from "MarkupParser";
import {ServerTime, StemDate} from "Time";

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

    edit(content, onSuccess, onError) {
        //TODO: send a message to the server to edit this message with the new content
        let request = {
            messageId: this.id,
            message: content,
        };

        Ajax.postJSON("/chat/edit_message/", request).then(
            (data) => {
                if (data.error) {
                    console.log("error saving message edit", data);
                    if (onError) {
                        onError(data);
                    }
                } else {
                    if (onSuccess) {
                        onSuccess(data);
                    }
                }
            },
            (error) => {
                console.log("Error in sending chat message:\n" + error.message);
                if (onError) {
                    onError(xhr, errmsg, err);
                }
            }
        );
    }

    react(reaction, onSuccess, onError) {
        let request = {
            messageId: this.id,
            reaction: reaction,
        };

        Ajax.postJSON("/chat/edit_message/", request).then(
            (data) => {
                if (data.error) {
                    console.log("error saving reaction", data);
                    if (onError) {
                        onError(data);
                    }
                } else {
                    if (onSuccess) {
                        onSuccess(data);
                    }
                }
            },
            (error) => {
                console.log("Error in saving reaction:\n" + error.message);
                console.log(error.stack);
                if (onError) {
                    onError(error);
                }
            }
        );
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
        // send a message to the server to delete this message
        let request = {
            messageId: this.id,
            hidden: true,
        };

        Ajax.postJSON("/chat/edit_message/", request).then(
            (data) => {
                if (onSuccess) {
                    onSuccess(data);
                }
            },
            (error) => {
                console.log("Error in sending delete message:\n" + error.message);
                console.log(error.stack);
                if (onError) {
                    onError(error);
                }
            }
        );
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
        this.online = new Set(this.online);
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
        if (event.type === "online") {
            this.online = new Set(event.data.online);
            this.online.delete(0);
            this.dispatch("usersChanged", event);
        } else if (event.type === "onlineDeltaJoined") {
            if (this.online == null) {
                this.online = new Set();
            }

            if (event.data.userId != 0) {
                this.online.add(event.data.userId);
            }

            this.dispatch("usersChanged", event);
        } else if (event.type === "onlineDeltaLeft") {
            if (this.online == null) {
                return;
            }

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
    let request = {
        userId: userId,
    };

    Ajax.postJSON("/chat/private_chat_state/", request).then(
        (data) => {
            if (data.error) {
                console.error("Failed to fetch objects of type ", this.objectType, ":\n", data.error);
                if (onError) {
                    onError(data.error);
                }
                return;
            }
            GlobalState.importState(data.state || {});
            onSuccess(PrivateChatStore.get(data.privateChatId));
        },
        (error) => {
            console.error("Error in fetching objects:\n" + error.message);
            console.error(error.stack);
            if (onError) {
                onError(error.message);
            }
        }
    );
};

PrivateChatStore.addListener("update", (obj, event) => {
    if (event.type === "privateMessage") {
        GlobalState.importState(event.state);
    }
});

export {MessageInstance, MessageInstanceStore, MessageThread, MessageThreadStore, PrivateChatStore, GroupChatStore};
