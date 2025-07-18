import {StoreObject, GenericObjectStore} from "../../../../stemjs/src/state/Store";
import {StoreId} from "../../../../stemjs/src/state/State";
import {ThemeProps} from "../../../../stemjs/src/ui/style/Theme";


class PredefinedTheme extends StoreObject {
    declare name: string;
    declare properties: ThemeProps;
    
    toString(): string {
        return this.name;
    }
}

class PredefinedThemeStoreClass extends GenericObjectStore<PredefinedTheme> {
    private declare customTheme?: PredefinedTheme;

    constructor() {
        super("PredefinedTheme", PredefinedTheme);
    }

    getCustomTheme(): PredefinedTheme {
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
        });
        return this.customTheme;
    }

    allWithCustom(): PredefinedTheme[] {
        return [...this.all(), this.getCustomTheme()];
    }

    getSafe(id: StoreId): PredefinedTheme {
        if (id === "custom") {
            return this.getCustomTheme();
        }
        return this.get(id) || this.get(1);
    }

    updateCustomTheme(properties: ThemeProps): void {
        Object.assign(this.getCustomTheme().properties, properties);
    }
}

export const ThemeStore = new PredefinedThemeStoreClass();
