import {coolStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {Language} from "./LanguageStore";

@coolStore
export class TranslationKey extends BaseStore("TranslationKey") {
    declare value: string;
}

@coolStore
export class TranslationEntry extends BaseStore("TranslationEntry") {
    declare languageId: number;
    declare translationKeyId: number;
    declare value: string;

    getLanguage() {
        return Language.get(this.languageId);
    }

    getTranslationKey() {
        return TranslationKey.get(this.translationKeyId);
    }
}

export const TranslationKeyStore = TranslationKey;
export const TranslationEntryStore = TranslationEntry;

Language.addListener("buildTranslationMap", (language: Language) => {
    for (const translationEntry of TranslationEntry.all()) {
        if (translationEntry.languageId === language.id) {
            const translationKey = translationEntry.getTranslationKey();
            if (translationKey) {
                language.translationMap.set(translationKey.value, translationEntry.value);
            }
        }
    }
});
