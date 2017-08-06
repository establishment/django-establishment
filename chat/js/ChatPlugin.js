import {Plugin} from "Plugin";

class ChatPlugin extends Plugin {
    linkToParent(parent) {
        this.chatWidget = parent;
    }

    getChatbox() {
        return this.chatWidget.chatInput;
    }
}

export {ChatPlugin};