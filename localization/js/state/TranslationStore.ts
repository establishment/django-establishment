import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";
import {Language} from "./LanguageStore";

@globalStore
export class TranslationKey extends BaseStore("TranslationKey") {
    declare value: string;
}

@globalStore
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
