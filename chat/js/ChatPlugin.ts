import {Plugin} from "../../../stemjs/base/Plugin";

export class ChatPlugin extends Plugin {
    // The widget the plugins reach into for its input, its own plugins and sendMessage
    declare chatWidget: any;

    linkToParent(parent) {
        this.chatWidget = parent;
    }

    getChatbox() {
        return this.chatWidget.chatInput;
    }
}
