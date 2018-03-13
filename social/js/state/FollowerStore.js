import {StoreObject, GenericObjectStore} from "state/Store";

import {UserStore} from "UserStore";


export class Follower extends StoreObject {

}


class FollowerStoreClass extends GenericObjectStore {
    constructor() {
        super("social_follower", Follower, {
            dependencies: ["user"]
        });
    }

    getFollowed(userId) {
        return FollowerStore.all().filter(follower => follower.userId === userId).map(
            follower => UserStore.get(follower.targetId)
        );
    }
}


export const FollowerStore = new FollowerStoreClass();
