import {Ajax} from "Ajax";
import {Dispatchable} from "Dispatcher";
import {SocialAccountManager} from "SocialAccountManager";
import {SocialAppStore} from "SocialAppStore";

class FacebookManager extends SocialAccountManager {
    constructor() {
        super(SocialAppStore.getSocialAppByName("Facebook"), {
            version: "v2.7",
            loginByTokenUrl: "/accounts/facebook/login/token/",
            loginOptions: {
                auth_type: "rerequest",
                scope: "email"
            },
            logoutUrl: "/accounts/logout/",
            // TODO: should probably look at https://www.facebook.com/translations/FacebookLocales.xml and Language.Locale
            locale: "en_US",
        });
        this.ensureScriptNodeExists();
    }

    sendData(url, data) {
        Ajax.postJSON(url, data).then(
            (data) => {
                if (data.next) {
                    self.location.href = data.next;
                } else {
                    location.reload();
                }
            },
            (error) => {
                this.dispatch("loginError", error);
            }
        );
    }

    ensureScriptNodeExists() {
        self.fbAsyncInit = () => {
            FB.init({
                appId: this.getClientId(),
                version: this.options.version,
                status: true,
                cookie: true,
                xfbml: true
            });

            this.setLoaded();
        };

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

    onLoginCanceled(response) {
    }

    onLoginError(response) {
    }

    onLoginSuccess(response, nextUrl, process) {
        let data = {
            next: nextUrl || '',
            process: process,
            accessToken: response.authResponse.accessToken,
            expiresIn: response.authResponse.expiresIn
        };
        this.sendData(this.options.loginByTokenUrl, data);
    }

    logout() {
        if (!self.FB) {
            return;
        }
        FB.logout((response) => {
            this.onLogoutSuccess(response, nextUrl);
        });
    }

    onLogoutSuccess(response) {
        if (this.options.logoutUrl) {
            this.sendData(this.options.logoutUrl, data);
        }
    }

    handleProcess(nextUrl, action, process) {
        if (!this.loaded) {
            this.addListenerOnce("loaded", () => this.handleProcess(process));
            return;
        }

        if (action === "reauthenticate") {
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

    login(nextUrl, action, process) {
        this.handleProcess(nextUrl=self.location.pathname, action="authenticate", process="login");
    }

    connect(nextUrl, action, process) {
        this.handleProcess(nextUrl=self.location.pathname, action="authenticate", process="connect");
    }
}

export {FacebookManager};
