import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State.js";

@globalStore
export class EmailTemplate extends BaseStore("EmailTemplate") {
    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

