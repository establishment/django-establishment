import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";
import {Language} from "./LanguageStore";


class TranslationKey extends StoreObject {
    declare id: number;
    declare value: string;
}

export const TranslationKeyStore = new GenericObjectStore("TranslationKey", TranslationKey);

class TranslationEntry extends StoreObject {
    declare id: number;
    declare languageId: number;
    declare translationKeyId: number;
    declare value: string;

    getLanguage() {
        return Language.get(this.languageId);
    }

    getTranslationKey() {
        return TranslationKeyStore.get(this.translationKeyId);
    }
}

export const TranslationEntryStore = new GenericObjectStore("TranslationEntry", TranslationEntry);

Language.addListener("buildTranslationMap", (language: any) => {
    for (const translationEntry of TranslationEntryStore.all()) {
        if (translationEntry.languageId === language.id) {
            const translationKey = translationEntry.getTranslationKey();
            if (translationKey) {
                language.translationMap.set(translationKey.value, translationEntry.value);
            }
        }
    }
});
