import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailStatus extends StoreObject {}

class EmailStatusStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailStatusStore = new EmailStatusStoreClass("EmailStatus", EmailStatus);

export {EmailStatusStore, EmailStatus};
