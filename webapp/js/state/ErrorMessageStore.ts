import {coolStore, BaseStore} from "../../../../stemjs/src/state/StoreRewrite";
import {TranslationKeyStore} from "../../../localization/js/state/TranslationStore";
import {StoreId} from "../../../../stemjs/src/state/State";

@coolStore
export class ErrorMessageObject extends BaseStore("ErrorMessage") {
    declare id: number;
    declare translationKeyId: StoreId;

    getTranslation() {
        let translationKey = TranslationKeyStore.get(this.translationKeyId);
        return translationKey;
    }
}

export const ErrorMessage = ErrorMessageObject;
export const ErrorMessageStore = ErrorMessageObject;
