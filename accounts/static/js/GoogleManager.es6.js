import {Ajax} from "Ajax";

class GoogleManager {
    constructor() {
        this.options = Object.assign({
            loginByTokenUrl: "/accounts/google/login/token/",
        }, window.GOOGLE_MANAGER_OPTIONS || {});
        this.ensureGoogleScriptNodeExists();
    }

    static Global() {
        if (!this._Global) {
            this._Global = new GoogleManager();
        }
        return this._Global;
    }

    ensureGoogleScriptNodeExists() {
        const id = "google-jsapi";
        if (document.getElementById(id)) {
            return;
        }
        let scriptElement = document.createElement("script");
        scriptElement.id = id;
        scriptElement.async = true;
        scriptElement.onload = () => {this.init()};
        scriptElement.src = "https://apis.google.com/js/platform.js";
        document.getElementsByTagName("head")[0].appendChild(scriptElement);
    }

    init() {
        gapi.load("auth2", () => {
            gapi.auth2.init({
                client_id: this.options.clientId,
            }).then(() => {
                // Listen for sign-in state changes.
                // gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSigninStatus);
                this.getGoogleAuth().isSignedIn.listen(this.updateSigninStatus);

                // Handle the initial sign-in state.
                // this.updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
                this.updateSigninStatus(this.getGoogleAuth().isSignedIn.get());
            });
        })
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
            console.log("google user is signed in");
        }
    }

    handleAuthClick(nextUrl, process, onSuccess) {
        this.getGoogleAuth().grantOfflineAccess({"redirect_uri": "postmessage"}).then((data) => {
            Object.assign(data, {
                next: nextUrl || "",
                process: process,
            });
            this.sendData(this.options.loginByTokenUrl, data, onSuccess);
        });
    }

    sendData(url, data, onSuccess) {
        Ajax.request({
            url: url,
            type: "POST",
            dataType: "json",
            data: data,
            success: (data) => {
                if (data.error) {
                    alert(data.error.toString());
                } else {
                    if (onSuccess) {
                        onSuccess(data);
                    }
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error :\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }
}

export {GoogleManager};
