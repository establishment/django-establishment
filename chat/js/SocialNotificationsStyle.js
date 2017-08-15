import {StyleSheet} from "Style";
import {styleRule, styleRuleInherit} from "decorators/Style";

class MessagesPanelListStyle extends StyleSheet {
    descriptionFontSize = "1.05em";

    @styleRule
    messagesPanelList = {
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
    };

    @styleRule
    textInputStyle = {
        backgroundColor: "#eee",
        border: "0",
        width: "85%",
        height: "30px",
        lineHeight: "30px",
        display: "inline-block",
        float: "left",
        outline: "none",
    };
}

export {MessagesPanelListStyle};
