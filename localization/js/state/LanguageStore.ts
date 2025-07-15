// A basic store that can be used to keep objects that map to ISO-code backed languages
import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";

class LanguageObject extends StoreObject {
    declare id: number;
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
        Language.dispatch("buildTranslationMap", this);
        callback(this.translationMap);
    }
}

class LanguageStoreClass extends GenericObjectStore<LanguageObject> {
    declare Locale: LanguageObject;

    constructor() {
        super("Language", LanguageObject);
    }

    getLanguageForCode(isoCode: string): LanguageObject | undefined {
        for (const language of this.all()) {
            if (language.isoCode === isoCode) {
                return language;
            }
        }
    }

    setLocale(language: LanguageObject): void {
        if (this.Locale == language) {
            return;
        }
        this.Locale = language;
        this.dispatch("localeChange", language);
    }

    getLocale(): LanguageObject {
        return this.Locale;
    }
}

export const Language = new LanguageStoreClass();
