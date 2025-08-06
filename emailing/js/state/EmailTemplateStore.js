import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {GlobalState} from "../../../../stemjs/src/state/State.js";

@globalStore
export class EmailTemplate extends BaseStore("EmailTemplate") {
    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

