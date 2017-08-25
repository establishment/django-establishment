import {StyleSheet} from "ui/Style";
import {styleRule, styleRuleCustom} from "decorators/Style";

export class GlobalStyleSheet extends StyleSheet {
    @styleRuleCustom({selector: "body"})
    body = {
        margin: 0,
        fontFamily: this.themeProperties.FONT_FAMILY_SANS_SERIF
    };

    @styleRuleCustom({selector: ".hidden"})
    hidden = {
        display: "none !important"
    };

    @styleRuleCustom({selector: "*"})
    everything = {
        boxSizing: "border-box"
    };

    @styleRuleCustom({selector: "a"})
    a = {
        textDecoration: "none",
        color: this.themeProperties.COLOR_LINK || "#337ab7"
    };

    static instantiate() {
        const styleSheet = this.getInstance();

        for (const key of Object.keys(styleSheet.constructor.prototype)) {
            // Just hit the getter to instantiate the style
            styleSheet[key];
        }
    }
}


