import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {GlobalState} from "state/State";

@globalStore
export class EmailStatus extends BaseStore("EmailStatus") {
    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

