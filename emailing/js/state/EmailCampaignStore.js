import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/OldStore.js";
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
