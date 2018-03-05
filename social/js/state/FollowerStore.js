import {StoreObject, GenericObjectStore} from "state/Store";


export class Follower extends StoreObject {

}


export const FollowerStore = new GenericObjectStore("social_follower", Follower, {
    dependencies: ["user"]
});
