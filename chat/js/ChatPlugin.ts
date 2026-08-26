import {Plugin} from "../../../stemjs/base/Plugin";

export class ChatPlugin extends Plugin {
    declare chatWidget: any;

    linkToParent(parent) {
        this.chatWidget = parent;
    }

    getChatbox() {
        return this.chatWidget.chatInput;
    }
}
