import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store.js";
import {Language} from "./LanguageStore.js";


class TranslationKey extends StoreObject {
}

export const TranslationKeyStore = new GenericObjectStore("TranslationKey", TranslationKey);

class TranslationEntry extends StoreObject {
    getLanguage() {
        return Language.get(this.languageId);
    }

    getTranslationKey() {
        return TranslationKeyStore.get(this.translationKeyId);
    }
}

export const TranslationEntryStore = new GenericObjectStore("TranslationEntry", TranslationEntry);

Language.addListener("buildTranslationMap", (language) => {
    for (let translationEntry of TranslationEntryStore.all()) {
        if (translationEntry.languageId === language.id) {
            language.translationMap.set(translationEntry.getTranslationKey().value, translationEntry.value);
        }
    }
});
