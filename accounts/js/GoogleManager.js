import {Ajax} from "Ajax";
import {ErrorHandlers} from "ErrorHandlers";
import {NOOP_FUNCTION} from "Utils";
import {SocialAccountManager} from "SocialAccountManager";
import {SocialAppStore} from "SocialAppStore";

class GoogleManager extends SocialAccountManager {
    constructor() {
        super(SocialAppStore.getSocialAppByName("Google"), {
            loginByTokenUrl: "/accounts/google/login/token/",
        });
        this.ensureScriptNodeExists();
    }

    sendData(url, data, onSuccess=NOOP_FUNCTION) {
        Ajax.postJSON(url, data).then(onSuccess);
    }

    ensureScriptNodeExists() {
        const id = "google-jsapi";
        if (document.getElementById(id)) {
            return;
        }
        let scriptElement = document.createElement("script");
        scriptElement.id = id;
        scriptElement.async = true;
        scriptElement.onload = () => {
            gapi.load("auth2", () => {
                gapi.auth2.init({
                    client_id: this.getClientId(),
                }).then(() => {
                    // Handle the initial sign-in state.
                    // this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                    this.updateSigninStatus(this.getGoogleAuth().isSignedIn.get());

                    // Listen for sign-in state changes.
                    // gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus);
                    this.getGoogleAuth().isSignedIn.listen(this.updateSigninStatus);

                    this.setLoaded();
                });
            });
        };
        scriptElement.src = "https://apis.google.com/js/platform.js";
        document.getElementsByTagName("head")[0].appendChild(scriptElement);
    }

    getGoogleAuth() {
        return gapi.auth2.getAuthInstance();
    }

    getGoogleUser() {
        return this.getGoogleAuth().currentUser.get();
    }

    getAuthResponse() {
        return this.getGoogleUser().getAuthResponse();
    }

    updateSigninStatus(isSignedIn) {
        if (isSignedIn) {
            console.log("Google user is signed in");
        }
    }

    handleProcess(process) {
        if (!this.loaded) {
            this.addListenerOnce("loaded", () => this.handleProcess(process));
            return;
        }
        this.getGoogleAuth().grantOfflineAccess({
            redirect_uri: "postmessage",
            immediate: false,
        }).then((data) => {
            Object.assign(data, {
                process: process,
            });
            this.sendData(this.options.loginByTokenUrl, data, () => self.location.reload());
        });
    }

    login() {
        this.handleProcess("login");
    }

    connect() {
        this.handleProcess("connect")
    }
}

export {GoogleManager};
