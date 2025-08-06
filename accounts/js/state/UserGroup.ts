import {PublicUser} from "../../../../csaaccounts/js/state/UserStore";
import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {StoreEvent, StoreId} from "../../../../stemjs/src/state/State";

@globalStore
export class UserGroup extends BaseStore("UserGroup") {
    declare name: string;
    members: Map<StoreId, UserGroupMember> = new Map();
    membersByUserId: Map<StoreId, UserGroupMember> = new Map();

    addMember(groupMember: UserGroupMember): void {
        this.members.set(groupMember.id, groupMember);
        this.membersByUserId.set(groupMember.userId, groupMember);
    }

    getMember(groupMemberId: StoreId): UserGroupMember | undefined {
        return this.members.get(groupMemberId);
    }

    getMemberById(groupMemberId: StoreId): UserGroupMember | undefined {
        return this.getMember(groupMemberId);
    }

    getMemberByUserId(userId: StoreId): UserGroupMember | undefined {
        return this.membersByUserId.get(userId);
    }

    removeMemberByUserId(userId: StoreId): void {
        const member = this.getMemberByUserId(userId);
        if (member) {
            this.members.delete(member.id);
            this.membersByUserId.delete(member.userId);
            UserGroupMember.applyDeleteEvent({
                objectId: member.id
            } as StoreEvent);
        }
    }

    getMembers(): UserGroupMember[] {
        return [...this.members.values()];
    }

    static getByName(name: string): UserGroup | undefined {
        return this.all().find(group => group.name === name);
    }
}


@globalStore
export class UserGroupMember extends BaseStore("UserGroupMember", {
    dependencies: ["UserGroup"]
}) {
    declare userId: number;
    declare groupId: any;

    constructor(obj: any, event?: StoreEvent) {
        super(obj, event);
        this.getGroup()?.addMember(this);
    }

    delete(): void {
        this.getGroup()?.removeMemberByUserId(this.userId);
    }

    getGroup(): UserGroup | undefined {
        return UserGroup.get(this.groupId);
    }

    getPublicUser(): any {
        return PublicUser.get(this.userId);
    }
}
