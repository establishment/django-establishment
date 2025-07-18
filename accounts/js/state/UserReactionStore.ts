import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";

export class UserReactionCollection extends StoreObject {
    getUserReactionStore(): GenericObjectStore<UserReaction> {
        return this.getStore().getState().getStore("UserReaction");
    }

    getReactions(): UserReaction[] {
        return this.getUserReactionStore().all().filter(reaction => reaction.collectionId == this.id);
    }

    getCurrentUserReaction(): UserReaction | undefined {
        const currentUser = window.USER;
        return this.getReactions().find(userReaction => userReaction.userId == currentUser.id);
    }

    getCurrentUserReactionType(): string | undefined {
        const currentUserReaction = this.getCurrentUserReaction();
        return currentUserReaction?.type;
    }
}

export class UserReaction extends StoreObject {
    declare userId: number;
    declare collectionId: number;
    declare type: string;
}

export let UserReactionCollectionStore = new GenericObjectStore("UserReactionCollection", UserReactionCollection);
export let UserReactionStore = new GenericObjectStore("UserReaction", UserReaction);
