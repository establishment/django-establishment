import {GenericObjectStore, StoreObject} from "../../../../stemjs/src/state/Store";
import {TranslationKeyStore} from "../../../localization/js/state/TranslationStore";
import {StoreId} from "../../../../stemjs/src/state/State";

export class ErrorMessage extends StoreObject {
    declare translationKeyId: StoreId;

    getTranslation() {
        let translationKey = TranslationKeyStore.get(this.translationKeyId);
        return translationKey;
    }
}

// TODO @types MakeStore? registerStore?
class ErrorMessageStoreClass extends GenericObjectStore<ErrorMessage> {
    constructor() {
        super("ErrorMessage", ErrorMessage);
    }
}

export const ErrorMessageStore = new ErrorMessageStoreClass();
