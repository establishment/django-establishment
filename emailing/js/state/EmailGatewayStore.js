import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State.js";

@globalStore
export class EmailGateway extends BaseStore("EmailGateway") {
    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

