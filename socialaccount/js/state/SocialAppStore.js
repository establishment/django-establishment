import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

export class SocialApp extends StoreObject {
    getClientId() {
        return this.clientId;
    }
}

class SocialAppStoreClass extends GenericObjectStore {
    constructor() {
        super("SocialApp", SocialApp);
    }

    getSocialApps() {
        return this.all();
    }

    getSocialAppByName(name) {
        return this.all().find(socialApp => socialApp.name === name);
    }
}

export let SocialAppStore = new SocialAppStoreClass();
