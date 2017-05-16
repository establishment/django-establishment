import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailCampaign extends StoreObject {
    applyEvent(event) {
    }
}

class EmailCampaignStoreClass extends GenericObjectStore {
    applyEvent(event) {
        super.applyEvent(event);
    }

    registerStreams() {
        GlobalState.registerStream("admin-email-manage");
    }
}

const EmailCampaignStore = new EmailCampaignStoreClass("EmailCampaign", EmailCampaign);

export {EmailCampaignStore, EmailCampaign};
