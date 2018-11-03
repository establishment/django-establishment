import {StoreObject, GenericObjectStore} from "state/Store";
import {GlobalState} from "state/State";

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
