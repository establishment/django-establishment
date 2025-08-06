import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Panel} from "../../../stemjs/src/ui/UIPrimitives.jsx";
import {TabArea} from "../../../stemjs/src/ui/tabs/TabArea.jsx";

import {PublicUser} from "../../../csaaccounts/js/state/UserStore";
import {UserHandle} from "../../../csaaccounts/js/UserHandle.jsx";

class ProfilePanel extends Panel {
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

class UserProfilePanel extends TabArea {
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
