import {coolStore, BaseStore} from "../../../../stemjs/src/state/StoreRewrite";

@coolStore
export class UserReactionCollection extends BaseStore("UserReactionCollection") {

    getReactions(): UserReaction[] {
        return UserReaction.all().filter(reaction => reaction.collectionId == this.id);
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

@coolStore
export class UserReaction extends BaseStore("UserReaction") {
    declare userId: number;
    declare collectionId: number;
    declare type: string;
}

export const UserReactionCollectionStore = UserReactionCollection;
export const UserReactionStore = UserReaction;
