import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State";

@globalStore
export class EmailCampaign extends BaseStore("EmailCampaign") {
    declare name: string;
    declare fromAddress: string;
    declare gatewayId: number | null;
    declare isNewsletter: boolean;
    declare emailsSent: number;
    declare emailsRead: number;

    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

