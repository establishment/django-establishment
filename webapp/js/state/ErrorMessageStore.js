import {GenericObjectStore, StoreObject} from "../../../../stemjs/src/state/Store";
import {TranslationKeyStore} from "../../../localization/js/state/TranslationStore.js";

export class ErrorMessage extends StoreObject {
    getTranslation() {
        let translationKey = TranslationKeyStore.get(this.translationKeyId);
    }
}

class ErrorMessageStoreClass extends GenericObjectStore {
    constructor() {
        super("ErrorMessage", ErrorMessage);
    }
}

export const ErrorMessageStore = new ErrorMessageStoreClass();
