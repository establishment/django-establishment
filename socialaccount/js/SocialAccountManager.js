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

    // TODO: all managers should call the onError function (if one is passed in) to report issues
    static login(callback, onError) {
        this.getInstance().login(...arguments);
    }

    static connect(callback, onError) {
        this.getInstance().connect(...arguments);
    }
}

export {SocialAccountManager};
