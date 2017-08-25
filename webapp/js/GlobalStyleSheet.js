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
}
