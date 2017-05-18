import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailTemplate extends StoreObject {}

class EmailTemplateStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailTemplateStore = new EmailTemplateStoreClass("EmailTemplate", EmailTemplate);

export {EmailTemplateStore, EmailTemplate};
