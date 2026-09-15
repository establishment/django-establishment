import {Dispatchable} from "../../../stemjs/base/Dispatcher";
import {type SocialApp} from "./state/SocialAppStore";

export interface SocialAccountManagerOptions {
    loginWindowOptions?: string;
    loginByTokenUrl?: string;
}

// Provided by every subclass - the statics below are only a shortcut through getInstance(). Merged in
// rather than declared as fields, so a subclass can implement them as the methods they are.
interface SocialAccountManager {
    login(...args: Parameters<typeof SocialAccountManager.login>): void;
    connect(...args: Parameters<typeof SocialAccountManager.connect>): void;
}

class SocialAccountManager extends Dispatchable {
    declare socialApp: SocialApp;
    declare options: SocialAccountManagerOptions;
    declare loaded: boolean;
    // Only ever constructed through a subclass, whose own constructor takes nothing
    declare static globalInstance: SocialAccountManager;

    // options stays open: every subclass calls super with its own extended shape, and a constructor
    // parameter cannot be typed against the class's own `options` field (TS17009)
    constructor(socialApp?: SocialApp, options?) {
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
        if (!this.globalInstance) {
            this.globalInstance = new this();
        }
        return this.globalInstance;
    }

    // TODO: all managers should call the onError function (if one is passed in) to report issues
    static login(callback?: () => void, onError?: (error: unknown) => void) {
        this.getInstance().login(...arguments);
    }

    static connect(callback?: () => void, onError?: (error: unknown) => void) {
        this.getInstance().connect(...arguments);
    }
}

export {SocialAccountManager};
