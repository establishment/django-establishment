import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store.js";
import {GlobalState} from "../../../../stemjs/src/state/State.js";

export class EmailGateway extends StoreObject {
    toString() {
        return this.name;
    }
}

class EmailGatewayStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailGatewayStore = new EmailGatewayStoreClass("EmailGateway", EmailGateway);
