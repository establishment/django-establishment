// A basic store that can be used to keep objects that map to ISO-code backed languages
import {globalStore, BaseStore} from "../../../../stemjs/src/state/Store";

@globalStore
export class Language extends BaseStore("Language") {
    declare name: string;
    declare localName?: string;
    declare isoCode: string;
    translationMap: Map<any, any> = new Map();

    toString(): string {
        let name = this.name;
        if (this.localName && this.localName != this.name) {
            name += " (" + this.localName + ")";
        }
        return name;
    }

    buildTranslation(callback: (translationMap: Map<any, any>) => void): void {
        this.getStore().dispatch("buildTranslationMap", this);
        callback(this.translationMap);
    }

    declare static Locale: Language;

    static getLanguageForCode(isoCode: string): Language | undefined {
        for (const language of this.all()) {
            if (language.isoCode === isoCode) {
                return language;
            }
        }
    }

    static setLocale(language: Language): void {
        if (this.Locale == language) {
            return;
        }
        this.Locale = language;
        this.dispatch("localeChange", language);
    }

    static getLocale(): Language {
        return this.Locale;
    }
}
