import {Dispatchable} from "../../../stemjs/base/Dispatcher";

export interface SocialAccountManagerOptions {
    loginWindowOptions?: string;
    loginByTokenUrl?: string;
}

// Provided by every subclass - the statics below are only a shortcut through getInstance(). Merged in
// rather than declared as fields, so a subclass can implement them as the methods they are.
interface SocialAccountManager {
    login(...args: any[]): void;
    connect(...args: any[]): void;
}

class SocialAccountManager extends Dispatchable {
    declare socialApp: any;
    declare options: SocialAccountManagerOptions;
    declare loaded: boolean;
    // Only ever constructed through a subclass, whose own constructor takes nothing
    declare static _Global: SocialAccountManager;

    constructor(socialApp?, options?) {
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

    static connect(callback?, onError?) {
        this.getInstance().connect(...arguments);
    }
}

export {SocialAccountManager};
