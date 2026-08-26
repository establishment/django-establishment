import {UI, type ElementOptions, type ExtendedOptions} from "../../../stemjs/ui/UIBase";
import {TabArea} from "../../../stemjs/ui/tabs/TabArea";

import {PublicUser} from "../../../csaaccounts/js/state/UserStore";
import {UserHandle} from "../../../csaaccounts/js/UserHandle";

export interface ProfilePanelOptions {
    user?: any;
}

class ProfilePanel extends UI.Element {
    declare options: ElementOptions<ProfilePanelOptions>;

    render() {
        let infos = [
            <p>Username: <UserHandle style={{display:"inline"}} userId={this.options.user.id}/></p>
        ];
        if (this.options.user.name != "") {
            infos.push(
                <p>{"Name: " + this.options.user.name}</p>
            );
        }
        return [
            <h3>General Info</h3>,
            <div style={{"marginLeft": "50px"}}>
                {infos}
            </div>,
        ];
    }
}

export interface UserProfilePanelOptions {
    userId?: any;
}

class UserProfilePanel extends TabArea {
    declare options: ExtendedOptions<TabArea, UserProfilePanelOptions>;
    declare user: any;

    setOptions(options) {
        super.setOptions(options);

        this.setUser(PublicUser.get(this.options.userId));

        this.options.children = [
            <ProfilePanel title="Profile" user={this.user} active={true}/>
        ];
    }

    setUser(user) {
        this.user = user;
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();
        attr.setStyle("height", "1000px");
        attr.setStyle("width", "100%");
        return attr;
    }
}

export {UserProfilePanel}
