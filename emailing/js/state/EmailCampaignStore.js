import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store.js";
import {GlobalState} from "state/State";

@globalStore
export class EmailCampaign extends BaseStore("EmailCampaign") {
    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

