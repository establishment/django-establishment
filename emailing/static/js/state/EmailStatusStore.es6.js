import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailStatus extends StoreObject {
    applyEvent(event) {
    }
}

class EmailStatusStoreClass extends GenericObjectStore {
    applyEvent(event) {
        super.applyEvent(event);
    }

    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailStatusStore = new EmailStatusStoreClass("EmailStatus", EmailStatus);

export {EmailStatusStore, EmailStatus};
