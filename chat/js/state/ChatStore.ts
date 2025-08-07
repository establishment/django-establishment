import {FetchStoreMixin, FetchJob} from "../../../../stemjs/src/state/mixins/FetchStoreMixin";
import {BaseStore, globalStore, StoreObject} from "../../../../stemjs/src/state/Store";
import {GlobalState, StoreEvent, StoreId} from "../../../../stemjs/src/state/State";
import {Ajax} from "../../../../stemjs/src/base/Ajax";
import {MessageThread} from "./MessageThreadStore";

export class BaseChatObject extends StoreObject {
    declare messageThreadId: number;

    getMessageThread(): MessageThread | undefined {
        return MessageThread.get(this.messageThreadId);
    }

    getOnlineUserIds() {
        return this.getMessageThread()?.online;
    }
}


@globalStore
export class GroupChat extends FetchStoreMixin("GroupChat", {
    fetchURL: "/chat/group_chat_state/",
    maxFetchObjectCount: 1,
}, BaseChatObject) {
    static getFetchRequestData(entries: [StoreId, FetchJob[]][]) {
        return {
            chatId: entries.map(entry => entry[0])[0],
        };
    }
}


@globalStore
export class PrivateChat extends BaseStore("PrivateChat", {}, BaseChatObject) {
    declare user1Id: number;
    declare user2Id: number;

    getOtherUserId(): number {
        return (USER.id === this.user1Id ? this.user2Id : this.user1Id);
    }

    static getChatWithUser(userId: StoreId): PrivateChat | null {
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
    }

    static fetchForUser(userId: StoreId, onSuccess: (chat: PrivateChat) => void, onError: (error: any) => void): void {
        Ajax.postJSON("/chat/private_chat_state/", {
            userId: userId,
        }).then(
            (data: any) => onSuccess(PrivateChat.get(data.privateChatId)),
            onError
        );
    }
}

PrivateChat.addChangeListener((obj: PrivateChat, event: StoreEvent) => {
    if (event.type === "privateMessage") {
        GlobalState.importState(event.state);
    }
});
