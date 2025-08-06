import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {GlobalState} from "../../../../stemjs/src/state/State.js";

@globalStore
export class EmailGateway extends BaseStore("EmailGateway") {
    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailGatewayStore = EmailGateway;
