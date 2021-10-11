import {UI} from "ui/UI";
import {Button} from "ui/button/Button";
import {Level, Size} from "ui/Constants";
import {Ajax} from "base/Ajax";

import {UserGroupStore, UserGroupMemberStore} from "./state/UserGroupStore";
import {UserHandle} from "UserHandle";
import {UserInputField} from "UsersAutocompletion";


export class UserGroupMemberUI extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle("margin-top", "5px");
    }

    getDestroyButton() {
        return <Button level={Level.DANGER} size={Size.EXTRA_SMALL} icon="minus"
                    ref="destroyButton" style={{marginRight: "5px"}}/>;
    }

    getUserHandle() {
        return <UserHandle userId={this.options.member.userId} />;
    }

    render() {
        return [
            this.getDestroyButton(),
            this.getUserHandle()
        ];
    }

    onMount() {
        this.destroyButton.addClickListener(() => Ajax.postJSON("/accounts/change_user_group/", {
            groupId: this.options.member.groupId,
            userId: this.options.member.userId,
            action: "remove"
        }).then(() => this.options.member.delete()));
    }
}


export class UserGroupEditor extends UI.Element {
    getGroup() {
        return UserGroupStore.get(this.options.groupId);
    }

    renderUserGroupMember(member) {
        return <UserGroupMemberUI member={member} />;
    }

    render() {
        const members = this.getGroup().getMembers();
        return [
            members.map(member => this.renderUserGroupMember(member)),
            <UserInputField ref="addUserField" style={{marginTop: "10px"}}/>
        ];
    }

    onMount() {
        this.addUserField.addListener("user", (userId) => Ajax.postJSON("/accounts/change_user_group/", {
            groupId: this.options.groupId,
            userId: userId,
            action: "add"
        }).then(() => this.addUserField.clear()));
        this.attachListener(UserGroupMemberStore, ["create", "delete"], (userGroupMember) => {
            if (userGroupMember.groupId === this.options.groupId) {
                this.redraw();
            }
        });
    }
}
