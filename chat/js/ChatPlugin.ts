import {Plugin} from "../../../stemjs/base/Plugin";
// Type-only, since ChatWidget names this module back
import {type ChatWidget} from "./ChatWidget";

export class ChatPlugin extends Plugin {
    // The widget the plugins reach into for its input, its own plugins and sendMessage
    declare chatWidget: InstanceType<ReturnType<typeof ChatWidget>>;

    linkToParent(parent: ChatPlugin["chatWidget"]) {
        this.chatWidget = parent;
    }

    getChatbox() {
        return this.chatWidget.chatInput;
    }
}
