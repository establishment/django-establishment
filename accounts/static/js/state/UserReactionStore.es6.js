import {StoreObject, GenericObjectStore} from "Store";
import {GlobalState} from "State";

export class UserReactionCollection extends StoreObject {
    getUserReactionStore() {
        return this.getStore().getState().getStore("UserReaction");
    }

    // TODO should be done as generator? Clearly needs to have indexed data!
    getReactions() {
        let reactions = [];
        for (let reaction of this.getUserReactionStore().all()) {
            if (reaction.collectionId == this.id) {
                reactions.push(reaction);
            }
        }
        return reactions;
    }

    getCurrentUserReaction() {
        let currentUser = window.USER;
        for (const userReaction of this.getReactions()) {
            if (userReaction.userId == currentUser.id) {
                return userReaction;
            }
        }
        return null;
    }

    getCurrentUserReactionType() {
        const currentUserReaction = this.getCurrentUserReaction();
        return currentUserReaction && currentUserReaction.type;
    }
}

export class UserReaction extends StoreObject {
}

export let UserReactionCollectionStore = new GenericObjectStore("UserReactionCollection", UserReactionCollection);
export let UserReactionStore = new GenericObjectStore("UserReaction", UserReaction);