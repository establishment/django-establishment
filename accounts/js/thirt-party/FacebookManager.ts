import {type ExtendedOptions} from "../../../../stemjs/ui/UIBase";
import {Ajax} from "../../../../stemjs/base/Ajax";
import {SocialApp} from "../../../socialaccount/js/state/SocialAppStore";
import {SocialAccountManager} from "../../../socialaccount/js/SocialAccountManager";

// What the SDK's login callback answers with, as far as the handlers below read it
interface FacebookLoginResponse {
    status?: string;
    authResponse?: {accessToken: string, expiresIn: number};
}

export interface FacebookManagerOptions {
    locale?: string;
    loginOptions?: {auth_type: string, scope: string};
    version?: string;
}

class FacebookManager extends SocialAccountManager {
    declare options: ExtendedOptions<SocialAccountManager, FacebookManagerOptions>;

    constructor() {
        super(SocialApp.getSocialAppByName("Facebook"), {
            version: "v2.7",
            loginByTokenUrl: "/accounts/facebook/login/token/",
            loginOptions: {
                auth_type: "rerequest",
                scope: "email"
            },
            // TODO: should probably look at https://www.facebook.com/translations/FacebookLocales.xml and Language.Locale
            locale: "en_US",
        });
        this.ensureScriptNodeExists();
    }

    sendData(url: string, data: object) {
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

    onLoginCanceled(response: FacebookLoginResponse) {
    }

    onLoginError(response: FacebookLoginResponse) {
    }

    onLoginSuccess(response: FacebookLoginResponse, nextUrl: string, process: string) {
        let data = {
            next: nextUrl || '',
            process: process,
            accessToken: response.authResponse.accessToken,
            expiresIn: response.authResponse.expiresIn
        };
        this.sendData(this.options.loginByTokenUrl, data);
    }

    handleProcess(nextUrl: string, action?: string, process?: string) {
        if (!this.loaded) {
            this.addListenerOnce("loaded", () => this.handleProcess(nextUrl, action, process));
            return;
        }

        if (action === "reauthenticate") {
            this.options.loginOptions.auth_type = action;
        }

        FB.login((response: FacebookLoginResponse) => {
            if (response.authResponse) {
                this.onLoginSuccess(response, nextUrl, process);
            } else if (response && response.status && ["not_authorized", "unknown"].indexOf(response.status) > -1) {
                this.onLoginCanceled(response);
            } else {
                this.onLoginError(response);
            }
        }, this.options.loginOptions);
    }

    login(nextUrl?: string, action?: string, process?: string) {
        this.handleProcess(nextUrl=self.location.pathname, action="authenticate", process="login");
    }

    connect(nextUrl?: string, action?: string, process?: string) {
        this.handleProcess(nextUrl=self.location.pathname, action="authenticate", process="connect");
    }
}

export {FacebookManager};
