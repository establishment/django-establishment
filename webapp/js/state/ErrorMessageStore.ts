import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {TranslationKey} from "../../../localization/js/state/TranslationStore";
import {StoreId} from "../../../../stemjs/state/State";

@globalStore
export class ErrorMessage extends BaseStore("ErrorMessage") {
    declare translationKeyId: StoreId;

    getTranslation() {
        const translationKey = TranslationKey.get(this.translationKeyId);
        return translationKey;
    }
}
