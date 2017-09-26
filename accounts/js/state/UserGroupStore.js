import {PublicUserStore} from "UserStore";

import {StoreObject, GenericObjectStore} from "Store";


class UserGroup extends StoreObject {
    constructor(...args) {
        super(...args);
        this.members = new Map();
        this.membersByUserId = new Map();
    }

    addMember(groupMember) {
        this.members.set(groupMember.id, groupMember);
        this.membersByUserId.set(groupMember.userId, groupMember);
    }

    getMember(groupMemberId) {
        return this.members.get(groupMemberId);
    }

    getMemberById(groupMemberId) {
        return this.getMember(groupMemberId);
    }

    getMemberByUserId(userId) {
        return this.membersByUserId.get(userId);
    }

    removeMemberByUserId(userId) {
        const member = this.getMemberByUserId(userId);
        if (member) {
            this.members.delete(member.id);
            this.membersByUserId.delete(member.userId);
            UserGroupMemberStore.applyDeleteEvent({
                objectId: member.id
            });
        }
    }

    getMembers() {
        return [...this.members.values()];
    }
}


class UserGroupStoreClass extends GenericObjectStore {
    constructor() {
        super("UserGroup", UserGroup);
    }

    getByName(name) {
        return this.all().find(group => group.name === name);
    }
}

export const UserGroupStore = new UserGroupStoreClass();


class UserGroupMember extends StoreObject {
    constructor(...args) {
        super(...args);
        this.getGroup().addMember(this);
    }

    delete() {
        this.getGroup().removeMemberByUserId(this.userId);
    }

    getGroup() {
        return UserGroupStore.get(this.groupId);
    }

    getPublicUser() {
        return PublicUserStore.get(this.userId);
    }
}


export const UserGroupMemberStore = new GenericObjectStore("UserGroupMember", UserGroupMember, {
    dependencies: ["UserGroup"]
});
