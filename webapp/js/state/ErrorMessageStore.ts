import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {TranslationKey} from "../../../localization/js/state/TranslationStore";
import {type StoreId} from "../../../../stemjs/state/State";

@globalStore
export class ErrorMessage extends BaseStore("ErrorMessage") {
    declare translationKeyId: StoreId;
    declare message?: string; // Set on the client, by ErrorHandlers wrapping whatever was thrown
    declare fields?: {field: string; message: string}[]; // The request fields a typed view refused, and why

    getTranslation() {
        const translationKey = TranslationKey.get(this.translationKeyId);
        return translationKey;
    }
}
