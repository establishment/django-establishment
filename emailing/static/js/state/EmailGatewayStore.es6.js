import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailGateway extends StoreObject {
    toString() {
        return this.name;
    }
}

class EmailGatewayStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailGatewayStore = new EmailGatewayStoreClass("EmailGateway", EmailGateway);

export {EmailGatewayStore, EmailGateway};
