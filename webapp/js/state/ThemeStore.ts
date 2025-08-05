import {coolStore, BaseStore} from "../../../../stemjs/src/state/StoreRewrite";
import {StoreId} from "../../../../stemjs/src/state/State";
import {ThemeProps} from "../../../../stemjs/src/ui/style/Theme";

@coolStore
export class PredefinedThemeObject extends BaseStore("PredefinedTheme") {
    private static customTheme?: PredefinedThemeObject;

    declare id: string | number;
    declare name: string;
    declare properties: ThemeProps;
    
    toString(): string {
        return this.name;
    }

    static getCustomTheme(): PredefinedThemeObject {
        this.customTheme = this.customTheme || new this({
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

    static allWithCustom(): PredefinedThemeObject[] {
        return [...this.all(), this.getCustomTheme()];
    }

    static getSafe(id: StoreId): PredefinedThemeObject {
        if (id === "custom") {
            return this.getCustomTheme();
        }
        return this.get(id) || this.get(1);
    }

    static updateCustomTheme(properties: ThemeProps): void {
        Object.assign(this.getCustomTheme().properties, properties);
    }
}

export const PredefinedTheme = PredefinedThemeObject;
export const ThemeStore = PredefinedThemeObject;
