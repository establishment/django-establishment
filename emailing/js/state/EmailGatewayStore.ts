import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {GlobalState} from "../../../../stemjs/state/State";

@globalStore
export class EmailGateway extends BaseStore("EmailGateway") {
    declare name: string;
    declare host: string;
    declare port: number;
    declare useTLS: boolean;
    declare username: string;

    toString() {
        return this.name;
    }

    static registerStreams() {
        GlobalState.registerStream("admin-email-manager");
    }
}

