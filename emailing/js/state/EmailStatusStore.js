import {StoreObject, GenericObjectStore} from "state/Store";
import {GlobalState} from "state/State";

export class EmailStatus extends StoreObject {}

class EmailStatusStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailStatusStore = new EmailStatusStoreClass("EmailStatus", EmailStatus);
