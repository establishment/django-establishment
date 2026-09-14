import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {field} from "../../../../stemjs/state/StoreField";
import {Language} from "./LanguageStore";

@globalStore
export class TranslationKey extends BaseStore("TranslationKey") {
    declare id: number;
    declare value: string;
    declare comment?: string;
}

@globalStore
export class TranslationEntry extends BaseStore("TranslationEntry") {
    @field(Language) language;
    @field(TranslationKey) translationKey;
    declare value: string;

    getLanguage() {
        return this.language;
    }

    getTranslationKey() {
        return this.translationKey;
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
