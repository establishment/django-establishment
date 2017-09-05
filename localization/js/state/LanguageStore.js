// A basic store that can be used to keep objects that map to ISO-code backed languages
import {StoreObject, GenericObjectStore} from "Store";

class LanguageObject extends StoreObject {
    constructor(obj) {
        super(obj);
        this.translationMap = new Map();
    }

    toString() {
        let name = this.name;
        if (this.localName && this.localName != this.name) {
            name += " (" + this.localName + ")";
        }
        return name;
    }

    buildTranslation(callback) {
        Language.dispatch("buildTranslationMap", this);
        callback(this.translationMap);
    }
}

class LanguageStoreClass extends GenericObjectStore {
    constructor() {
        super("Language", LanguageObject);
    }

    getLanguageForCode(isoCode) {
        for (let language of this.all()) {
            if (language.isoCode === isoCode) {
                return language;
            }
        }
    }

    setLocale(language) {
        if (this.Locale == language) {
            return;
        }
        this.Locale = language;
        this.dispatch("localeChange", language);
    }

    getLocale() {
        return this.Locale;
    }
}

var Language = new LanguageStoreClass();

export {Language};
