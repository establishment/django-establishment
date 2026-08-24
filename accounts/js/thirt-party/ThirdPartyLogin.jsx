import {GoogleManager} from "./GoogleManager";
import {FacebookManager} from "./FacebookManager";
import {GithubManager} from "./GithubManager";
import {registerStyle} from "../../../../stemjs/ui/style/Theme";
import {LoginStyle} from "../LoginStyle";
import {UI} from "../../../../stemjs/ui/UIBase";
import {FAIcon} from "../../../../stemjs/ui/FontAwesome";
import {MakeIcon} from "../../../../stemjs/ui/SimpleElements";

export const THIRD_PARTY_LOGIN_HANDLERS = {
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

@registerStyle(LoginStyle)
class SocialConnectButton extends UI.Primitive("button") {
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


@registerStyle(LoginStyle)
export class ThirdPartyLogin extends UI.Element {
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