import {UI, TabArea, Panel} from "UI";
import {GlobalState} from "State";
import {PublicUserStore} from "UserStore";
import {MessageThreadStore} from "MessageThreadStore";
import {ChatWidget} from "ChatWidget";
import {UserHandle} from "UserHandle";

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

        this.setUser(PublicUserStore.get(this.options.userId));

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
