import {Ajax} from "Ajax";
import {Dispatchable} from "Dispatcher";

class SocialAccountManager extends Dispatchable {
    constructor(socialApp, options) {
        super();
        this.socialApp = socialApp;
        this.options = options;
    }

    getSocialApp() {
        return this.socialApp;
    }

    getClientId() {
        return this.getSocialApp().getClientId();
    }

    setLoaded() {
        this.loaded = true;
        this.dispatch("loaded");
    }

    static getInstance() {
        if (!this._Global) {
            this._Global = new this();
        }
        return this._Global;
    }

    static login() {
        this.getInstance().login(...arguments);
    }

    static connect() {
        this.getInstance().connect(...arguments);
    }
}

export {SocialAccountManager};
