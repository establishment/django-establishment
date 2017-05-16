import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailTemplate extends StoreObject {
    applyEvent(event) {
    }
}

class EmailTemplateStoreClass extends GenericObjectStore {
    applyEvent(event) {
        super.applyEvent(event);
    }

    registerStreams() {
        GlobalState.registerStream("admin-email-manage");
    }
}

const EmailTemplateStore = new EmailTemplateStoreClass("EmailTemplate", EmailTemplate);

export {EmailTemplateStore, EmailTemplate};
