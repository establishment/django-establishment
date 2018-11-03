import {GenericObjectStore, StoreObject} from "state/Store";

import {TranslationKeyStore} from "state/TranslationStore";

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
