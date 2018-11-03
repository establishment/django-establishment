import {StoreObject, GenericObjectStore} from "state/Store";
import {GlobalState} from "state/State";

export class EmailTemplate extends StoreObject {}

class EmailTemplateStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailTemplateStore = new EmailTemplateStoreClass("EmailTemplate", EmailTemplate);
