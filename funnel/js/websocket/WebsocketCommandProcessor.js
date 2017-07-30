import {Dispatchable} from "base/Dispatcher";
import {WebsocketSubscriber} from "./WebsocketSubscriber";

class WebsocketCommandProcessor {
    static addCommandProcessor(commandType, callback) {
        this.GLOBAL.addListener(commandType, callback);
    }

    static processCommand(command) {
        // TODO: should actually interpret this command more flexibly
        let commandType = command;
        let commandPayload = null;
        this.GLOBAL.dispatch(commandType, commandPayload);
    }
}

WebsocketCommandProcessor.GLOBAL = new Dispatchable();

// TODO: this probably shouldn't be here
WebsocketCommandProcessor.addCommandProcessor("reloadPage", (payload) => {
    location.reload();
});

WebsocketSubscriber.Global.addListener("serverCommand", (command) => {
    console.log("Processing server command ", command);
    WebsocketCommandProcessor.processCommand(command);
});

export {WebsocketCommandProcessor};
