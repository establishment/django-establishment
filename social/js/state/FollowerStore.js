import {globalStore, BaseStore} from "state/Store";
import {UserStore} from "state/UserStore";

@globalStore
export class Follower extends BaseStore("social_follower", {dependencies: ["user"]}) {
    static getFollowed(userId) {
        return this.all().filter(follower => follower.userId === userId).map(
            follower => UserStore.get(follower.targetId)
        );
    }
}

export const FollowerStore = Follower;
