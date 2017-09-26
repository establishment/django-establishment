import {StoreObject, GenericObjectStore} from "Store";
import {UserStore} from "UserStore";


class PredefinedTheme extends StoreObject {
    toString() {
        return this.name;
    }
}

class PredefinedThemeStoreClass extends GenericObjectStore {
    constructor() {
        super("PredefinedTheme", PredefinedTheme);
    }

    getCustomTheme() {
        this.customTheme = this.customTheme || new PredefinedTheme({
            properties: {
                COLOR_PRIMARY: null,
                COLOR_SECONDARY: null,
                COLOR_BACKGROUND_BODY: null,
                COLOR_BACKGROUND_ALTERNATIVE: null,
                FONT_FAMILY_DEFAULT: null,
            },
            name: "Custom",
            id: "custom",
        }, null, this);
        return this.customTheme;
    }

    allWithCustom() {
        return [...this.all(), this.getCustomTheme()];
    }

    getSafe(id) {
        if (id === "custom") {
            return this.getCustomTheme();
        }
        return this.get(id) || this.get(1);
    }

    updateCustomTheme(properties) {
        Object.assign(this.getCustomTheme().properties, properties);
    }
}

export const ThemeStore = new PredefinedThemeStoreClass();
