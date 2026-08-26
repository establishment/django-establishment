import {globalStore, BaseStore} from "../../../../stemjs/state/Store";

@globalStore
export class SocialApp extends BaseStore("SocialApp") {
    declare name: string;
    declare clientId: string;

    getClientId() {
        return this.clientId;
    }

    static getSocialApps() {
        return this.all();
    }

    static getSocialAppByName(name) {
        return this.all().find(socialApp => socialApp.name === name);
    }
}

