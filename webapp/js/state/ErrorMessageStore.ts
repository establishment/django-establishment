import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {TranslationKeyStore} from "../../../localization/js/state/TranslationStore";
import {StoreId} from "../../../../stemjs/src/state/State";

@globalStore
export class ErrorMessage extends BaseStore("ErrorMessage") {
    declare translationKeyId: StoreId;

    getTranslation() {
        let translationKey = TranslationKeyStore.get(this.translationKeyId);
        return translationKey;
    }
}

export const ErrorMessageStore = ErrorMessage;
