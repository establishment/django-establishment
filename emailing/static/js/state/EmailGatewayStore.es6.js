import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailGateway extends StoreObject {
    applyEvent(event) {
    }
}

class EmailGatewayStoreClass extends GenericObjectStore {
    applyEvent(event) {
        super.applyEvent(event);
    }

    registerStreams() {
        GlobalState.registerStream("admin-email-manage");
    }
}

const EmailGatewayStore = new EmailGatewayStoreClass("EmailGateway", EmailGateway);

export {EmailGatewayStore, EmailGateway};
