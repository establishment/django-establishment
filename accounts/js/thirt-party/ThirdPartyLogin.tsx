import {GoogleManager} from "./GoogleManager";
import {FacebookManager} from "./FacebookManager";
import {GithubManager} from "./GithubManager";
import {registerStyle} from "../../../../stemjs/ui/style/Theme";
import {LoginStyle} from "../LoginStyle";
import {UI, type ElementOptions} from "../../../../stemjs/ui/UIBase";
import {FAIcon} from "../../../../stemjs/ui/FontAwesome";
import {MakeIcon} from "../../../../stemjs/ui/SimpleElements";

// An embedder adds its own entries to the map below, and every read of it is by name
export interface ThirdPartyLoginHandler {
    name: string;
    color: string;
    icon: string;
    loginManager: {getInstance(): any; login(...args: any[]): void};
}

export const THIRD_PARTY_LOGIN_HANDLERS: Record<string, ThirdPartyLoginHandler> = {
    Google: {
        name: "Google",
        color: "#de4b39",
        icon: "google",
        loginManager: GoogleManager,
    },
    Facebook: {
        name: "Facebook",
        color: "#3b5998",
        icon: "facebook",
        loginManager: FacebookManager,
    },
    Github: {
        name: "Github",
        color: "#000",
        icon: "github",
        loginManager: GithubManager,
    },
};

export interface SocialConnectButtonOptions {
    loginElement?: any;
    specificInfo?: any;
}

@registerStyle(LoginStyle)
class SocialConnectButton extends UI.Primitive("button") {
    declare options: ElementOptions<SocialConnectButtonOptions>;

    extraNodeAttributes(attr) {
        let {specificInfo} = this.options;

        attr.addClass(this.styleSheet.socialConnectButtonContainer);
        attr.setStyle({
            backgroundColor: specificInfo.color,
        });
    }

    getLoginManager() {
        return this.options.specificInfo.loginManager.getInstance();
    }

    render() {
        let {specificInfo} = this.options;

        return [
            MakeIcon(specificInfo.icon, {className: this.styleSheet.socialConnectButtonIcon}),
            <span> {specificInfo.name}</span>
        ];
    }

    onMount() {
        // Access the login manager, to load any scripts needed by the social provider
        // TODO: try to find a way to not load all provider scripts on the login page
        this.getLoginManager();
        this.addClickListener(() => {
            this.options.loginElement?.clearErrorMessage();
            this.getLoginManager().login();
        });
    }
}


export interface ThirdPartyLoginOptions {
    socialApps?: any;
    loginElement?: any;
}

@registerStyle(LoginStyle)
export class ThirdPartyLogin extends UI.Element {
    declare options: ElementOptions<ThirdPartyLoginOptions>;

    getConnectWith() {
        return <div style={this.styleSheet.connectWith}>
            {UI.T("or connect with")}
        </div>;
    }

    getConnectWithButtons() {
        const {socialApps} = this.options;

        return (
            <div className={this.styleSheet.thirdPartyLoginContainer}>
                {
                    socialApps.map(socialApp => <SocialConnectButton
                        specificInfo={THIRD_PARTY_LOGIN_HANDLERS[socialApp.name]}
                        loginElement={this.options.loginElement}
                    />)
                }
            </div>
        );
    }

    render() {
        return [
            this.getConnectWith(),
            this.getConnectWithButtons(),
        ];
    }
}