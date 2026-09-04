import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State";

@globalStore
export class EmailTemplate extends BaseStore("EmailTemplate") {
        declare subject: string;
    declare html: string;
    declare plaintext: string | null;
    declare campaignId: number;
    declare version: number;
    declare languageId: number;
    declare gatewayId: number | null;
    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

