import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {type StoreId} from "../../../../stemjs/state/State";
import {User} from "../../../../stemjs/state/UserStore";

@globalStore
export class Follower extends BaseStore("social_follower", {dependencies: ["user"]}) {
    declare userId: StoreId;
    declare targetId: StoreId;

    static getFollowed(userId) {
        return this.all().filter(follower => follower.userId === userId).map(
            follower => User.get(follower.targetId)
        );
    }
}

