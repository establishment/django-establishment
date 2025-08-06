import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {TranslationKey} from "../../../localization/js/state/TranslationStore";
import {StoreId} from "../../../../stemjs/src/state/State";

@globalStore
export class ErrorMessage extends BaseStore("ErrorMessage") {
    declare translationKeyId: StoreId;

    getTranslation() {
        const translationKey = TranslationKey.get(this.translationKeyId);
        return translationKey;
    }
}
