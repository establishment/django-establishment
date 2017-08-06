import {GenericObjectStore, StoreObject} from "Store";
import {TranslationKeyStore} from "TranslationStore";

class ErrorMessage extends StoreObject {
    getTranslation() {
        let translationKey = TranslationKeyStore.get(this.translationKeyId);
    }
}

class ErrorMessageStoreClass extends GenericObjectStore {
    constructor() {
        super("ErrorMessage", ErrorMessage);
    }
}

let ErrorMessageStore = new ErrorMessageStoreClass();

export {ErrorMessageStore, ErrorMessage};
