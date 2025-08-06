import {GenericObjectStore, StoreObject} from "../../../../stemjs/src/state/OldStore";
import {AjaxFetchMixin, FetchJob} from "../../../../stemjs/src/state/StoreMixins";
import {GlobalState, StoreId} from "../../../../stemjs/src/state/State";
import {Ajax} from "../../../../stemjs/src/base/Ajax";
import {MessageThread, MessageThreadStore} from "./MessageThreadStore";

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
