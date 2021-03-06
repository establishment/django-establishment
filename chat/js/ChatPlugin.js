import {Plugin} from "base/Plugin";

export class ChatPlugin extends Plugin {
    linkToParent(parent) {
        this.chatWidget = parent;
    }

    getChatbox() {
        return this.chatWidget.chatInput;
    }
}
