import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class EmailCampaign extends StoreObject {}

class EmailCampaignStoreClass extends GenericObjectStore {
    registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

const EmailCampaignStore = new EmailCampaignStoreClass("EmailCampaign", EmailCampaign);

export {EmailCampaignStore, EmailCampaign};
