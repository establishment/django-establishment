import {globalStore, BaseStore} from "../../../../stemjs/state/Store.js";
import {GlobalState} from "../../../../stemjs/state/State";

@globalStore
export class EmailCampaign extends BaseStore("EmailCampaign") {
    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

