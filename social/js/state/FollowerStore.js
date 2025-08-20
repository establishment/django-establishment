import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {User} from "../../../../stemjs/state/UserStore";

@globalStore
export class Follower extends BaseStore("social_follower", {dependencies: ["user"]}) {
    static getFollowed(userId) {
        return this.all().filter(follower => follower.userId === userId).map(
            follower => User.get(follower.targetId)
        );
    }
}

