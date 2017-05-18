import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailGateway extends StoreObject {
    applyEvent(event) {
    }

    toString() {
        return this.name + ":" + this.port;
    }
}

class EmailGatewayStoreClass extends GenericObjectStore {
    applyEvent(event) {
        super.applyEvent(event);
    }

    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailGatewayStore = new EmailGatewayStoreClass("EmailGateway", EmailGateway);

export {EmailGatewayStore, EmailGateway};
