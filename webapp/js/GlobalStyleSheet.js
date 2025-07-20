import {StyleSheet, styleRuleCustom} from "ui/Style";

export class GlobalStyleSheet extends StyleSheet {
    @styleRuleCustom({selector: "body"})
    body = {
        margin: 0,
        fontSize: this.themeProps.FONT_SIZE_DEFAULT,
        fontFamily: this.themeProps.FONT_FAMILY_DEFAULT,
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
        color: this.themeProps.COLOR_LINK
    };

    @styleRuleCustom({selector: "hr"})
    hr = {
        height: 0,
        marginTop: "20px",
        marginBottom: "20px",
        border: 0,
        borderTop: "1px solid #eee",
        boxSizing: "content-box",
    };

    @styleRuleCustom({selector: "code, pre"})
    codeAndPre = {
        fontFamily: this.themeProps.FONT_FAMILY_MONOSPACE,
    };

    @styleRuleCustom({selector: "code"})
    code ={
        padding: "2px 4px", // TODO: should be in rem
        fontSize: "90%",
        color: "#345 !important", // TODO: take colors from theme
        backgroundColor: "#f8f2f4 !important",
        borderRadius: this.themeProps.BUTTON_BORDER_RADIUS,
    };

    @styleRuleCustom({selector: "pre"})
    pre = {
        overflow: "auto",
        display: "block",
        padding: 4,
        margin: "0 0 10px",
        fontSize: "13px",
        lineHeight: "1.42857143",
        color: "#333",
        wordBreak: "break-all",
        wordWrap: "break-word",
        backgroundColor: "#f5f5f5",
        border: "1px solid #ccc",
    };

    @styleRuleCustom({selector: "pre code"})
    preInCode = {
        padding: 0,
        fontSize: "inherit",
        color: "inherit",
        whiteSpace: "pre-wrap",
        backgroundColor: "transparent",
        borderRadius: 0,
    };
}
