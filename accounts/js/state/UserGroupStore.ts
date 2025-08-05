import {PublicUserStore} from "../../../../csaaccounts/js/state/UserStore.js";
import {coolStore, BaseStore} from "../../../../stemjs/src/state/StoreRewrite";
import {StoreEvent, StoreId} from "../../../../stemjs/src/state/State";

@coolStore
export class UserGroupObject extends BaseStore("UserGroup") {
    declare id: number;
    declare name: string;
    members: Map<StoreId, UserGroupMemberObject> = new Map();
    membersByUserId: Map<StoreId, UserGroupMemberObject> = new Map();

    addMember(groupMember: UserGroupMemberObject): void {
        this.members.set(groupMember.id, groupMember);
        this.membersByUserId.set(groupMember.userId, groupMember);
    }

    getMember(groupMemberId: StoreId): UserGroupMemberObject | undefined {
        return this.members.get(groupMemberId);
    }

    getMemberById(groupMemberId: StoreId): UserGroupMemberObject | undefined {
        return this.getMember(groupMemberId);
    }

    getMemberByUserId(userId: StoreId): UserGroupMemberObject | undefined {
        return this.membersByUserId.get(userId);
    }

    removeMemberByUserId(userId: StoreId): void {
        const member = this.getMemberByUserId(userId);
        if (member) {
            this.members.delete(member.id);
            this.membersByUserId.delete(member.userId);
            UserGroupMemberObject.applyDeleteEvent({
                objectId: member.id
            } as StoreEvent);
        }
    }

    getMembers(): UserGroupMemberObject[] {
        return [...this.members.values()];
    }

    static getByName(name: string): UserGroupObject | undefined {
        return this.all().find(group => group.name === name);
    }
}

@coolStore
export class UserGroupMemberObject extends BaseStore("UserGroupMember", {
    dependencies: ["UserGroup"]
}) {
    declare id: number;
    declare userId: number;
    declare groupId: any;

    constructor(obj: any, event?: StoreEvent) {
        super(obj, event);
        this.getGroup()?.addMember(this);
    }

    delete(): void {
        this.getGroup()?.removeMemberByUserId(this.userId);
    }

    getGroup(): UserGroupObject | undefined {
        return UserGroupObject.get(this.groupId);
    }

    getPublicUser(): any {
        return PublicUserStore.get(this.userId);
    }
}

export const UserGroup = UserGroupObject;
export const UserGroupStore = UserGroupObject;
export const UserGroupMember = UserGroupMemberObject;
export const UserGroupMemberStore = UserGroupMemberObject;
