import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State";

@globalStore
export class EmailStatus extends BaseStore("EmailStatus") {
    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

