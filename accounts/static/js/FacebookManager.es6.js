import {Ajax} from "Ajax";

// TODO: this class should only include Facebook SDK only when absolutely needed,
// so the user is not being tracked by those corporate assholes
// TODO: this class should be dispatchable, to dispatch on login for instance
class FacebookManager {
    constructor() {
        let options = Object.assign({
            version: "v2.7",
            loginByTokenUrl: "/accounts/facebook/login/token/",
            loginOptions: {
                auth_type: "rerequest",
                scope: "email"
            },
            logoutUrl: "/accounts/logout/",
            // TODO: should probably look at https://www.facebook.com/translations/FacebookLocales.xml and Language.Locale
            locale: "en_US",
        }, window.FACEBOOK_MANAGER_OPTIONS || {});
        this.init(options);
    }

    static Global() {
        if (!this._Global) {
            this._Global = new FacebookManager();
        }
        return this._Global;
    }

    sendData(url, data) {
        Ajax.request({
            url: url,
            type: "POST",
            dataType: "json",
            data: data,
            success: (dataJSON) => {
                if (dataJSON.next) {
                    window.location.href = dataJSON.next;
                } else {
                    location.reload();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error :\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    init(options) {
        this.options = options;

        window.fbAsyncInit = () => {
            FB.init({
                appId: this.options.appId,
                version: this.options.version,
                status: true,
                cookie: true,
                xfbml: true
            });
            this.onAsyncInit();
        };

        this.ensureFacebookSDKScriptNodeExists();
    }

    ensureFacebookSDKScriptNodeExists() {
        const id = "facebook-jssdk";
        if (document.getElementById(id)) {
            return;
        }
        let scriptElement = document.createElement("script");
        scriptElement.id = id;
        scriptElement.async = true;
        scriptElement.src = "//connect.facebook.net/" + this.options.locale + "/sdk.js";
        document.getElementsByTagName("head")[0].appendChild(scriptElement);
    }

    onAsyncInit() {
    }

    login(nextUrl, action, process) {
        if (!window.FB) {
            console.error("Can't process this request just yet");
            // TODO: should enqueue a request for onInit here
            return;
        }
        if (action == "reauthenticate") {
            this.options.loginOptions.auth_type = action;
        }

        FB.login((response) => {
            if (response.authResponse) {
                this.onLoginSuccess(response, nextUrl, process);
            } else if (response && response.status && ["not_authorized", "unknown"].indexOf(response.status) > -1) {
                this.onLoginCanceled(response);
            } else {
                this.onLoginError(response);
            }
        }, this.options.loginOptions);
    }

    onLoginCanceled(response) {
    }

    onLoginError(response) {
    }

    onLoginSuccess(response, nextUrl, process) {
        var data = {
            next: nextUrl || '',
            process: process,
            access_token: response.authResponse.accessToken,
            expires_in: response.authResponse.expiresIn
        };
        this.sendData(this.options.loginByTokenUrl, data);
    }

    logout(nextUrl) {
        if (!window.FB) {
            return;
        }
        FB.logout((response) => {
            this.onLogoutSuccess(response, nextUrl);
        });
    }

    onLogoutSuccess(response, nextUrl) {
        var data = {
            next: nextUrl || ''
        };

        if (this.options.logoutUrl) {
            this.sendData(this.options.logoutUrl, data);
        }
    }
}

export {FacebookManager};
