import {Ajax} from "Ajax";
import {AjaxFetchMixin} from "StoreMixins";
import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

class User extends StoreObject {
    constructor(obj) {
        super(obj);
    }

    getName() {
    }

    getCustomSetting(key, defaultValue) {
        let keyChain = key.split(":");
        let currentDict = this.customSettings;
        for (let key of keyChain) {
            if (key in currentDict) {
                currentDict = currentDict[key];
            } else {
                return defaultValue;
            }
        }
        return currentDict;
    }

    getParsedCustomSetting(key, defaultValue) {
        return JSON.parse(this.getCustomSetting(key, defaultValue));
    }

    setCustomSetting(key, value) {
        let keyChain = key.split(":");
        let lastKey = keyChain.pop();
        if (!this.customSettings) {
            this.customSettings = {};
        }
        let currentDict = this.customSettings;
        for (let key of keyChain) {
            if (!(key in currentDict)) {
                currentDict[key] = {};
            }
            currentDict = currentDict[key];
        }
        currentDict[lastKey] = value;

        this.dispatch("updateCustomSetting", {
            key: key,
            value: JSON.parse(value),
            rawValue: value,
            origin: "set",
        });
    }

    saveCustomSetting(key, value) {
        if (this.id != USER.id) {
            console.error("Invalid user");
            return;
        }

        this.dispatch("updateCustomSetting", {
            key: key,
            value: value,
            origin: "save",
        });

        let request = {
            customSettingsKey: key,
            customSettingsValue: value,
        };

        if (!this.timeouts) {
            this.timeouts = new Map();
        }
        if (this.timeouts.has(key)) {
            clearTimeout(this.timeouts.get(key));
        }
        this.timeouts.set(key, setTimeout(() => {
            Ajax.postJSON("/accounts/profile_changed/", request).then(() => {}, () => {});
        }));
    }

    applyEvent(event) {
        if (event.type === "setCustomSetting") {
            console.log("Updated custom settings: ", event);
            this.setCustomSetting(event["data"].key, event["data"].value);
        } else {
            super.applyEvent(event);
        }
    }
}

var UserStore = new GenericObjectStore("user", User);

UserStore.getCurrentUser = function () {
    return window.USER;
};

class PublicUser extends StoreObject {
    getDisplayHandle() {
        let name;
        if (this.displayName) {
            name = this.name || this.username;
        } else {
            name = this.username || this.name;
        }
        return name || ("user-" + this.id);
    }

    getProfileUrl() {
        if (this.username) {
            return "/user/" + this.username;
        } else {
            return "/userid/" + this.id;
        }
    }
}

// TODO: extend AjaxFetchMixin, to put the options in the constructor
var PublicUserStoreClass = AjaxFetchMixin(GenericObjectStore);

var PublicUserStore = new PublicUserStoreClass("publicuser", PublicUser, {
    fetchTimeoutDuration: 20,
    maxFetchObjectCount: 512,
    fetchURL: "/accounts/public_user_profiles/",
});

window.USER = Object.assign({
    id: 0,
    customSettings: {}
}, window.USER || {});

window.USER = UserStore.fakeCreate(window.USER);

class UserNotification extends StoreObject {
    getUser() {
        return UserStore.get(this.userId);
    }

    isRead() {
        return (this.id <= this.getUser().lastReadNotificationId);
    }
}

var UserNotificationStore = new GenericObjectStore("UserNotification", UserNotification, {dependencies: ["user"]});

export {UserStore, PublicUserStore, UserNotificationStore};
