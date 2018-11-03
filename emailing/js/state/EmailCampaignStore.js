import {StoreObject, GenericObjectStore} from "state/Store";
import {GlobalState} from "state/State";

export class EmailCampaign extends StoreObject {
    toString() {
        return this.name;
    }
}

class EmailCampaignStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

export const EmailCampaignStore = new EmailCampaignStoreClass("EmailCampaign", EmailCampaign);
