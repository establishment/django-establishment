import {globalStore, BaseStore} from "../../../../stemjs/state/Store";
import {StoreId} from "../../../../stemjs/state/State";
import {ThemeProps} from "../../../../stemjs/ui/style/Theme";

@globalStore
export class PredefinedTheme extends BaseStore("PredefinedTheme") {
    private static customTheme?: PredefinedTheme;

    declare id: string | number;
    declare name: string;
    declare properties: ThemeProps;
    
    toString(): string {
        return this.name;
    }

    static getCustomTheme(): PredefinedTheme {
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

    static allWithCustom(): PredefinedTheme[] {
        return [...this.all(), this.getCustomTheme()];
    }

    static getSafe(id: StoreId): PredefinedTheme {
        if (id === "custom") {
            return this.getCustomTheme();
        }
        return this.get(id) || this.get(1);
    }

    static updateCustomTheme(properties: ThemeProps): void {
        Object.assign(this.getCustomTheme().properties, properties);
    }
}
