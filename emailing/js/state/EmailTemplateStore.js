import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store.js";
import {GlobalState} from "../../../../stemjs/src/state/State.js";

export class EmailTemplate extends StoreObject {}

class EmailTemplateStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailTemplateStore = new EmailTemplateStoreClass("EmailTemplate", EmailTemplate);
