import {StyleSheet, styleRule, styleRuleInherit} from "UI";
import {Orientation} from "ui/Constants";

class VotingWidgetStyle extends StyleSheet {
    height = 40;
    size = 1;
    likeColor = this.options.likeColor || "#1E8921"; //            |
    dislikeColor = this.options.dislikeColor || "#C5302C"; //      |- Triadic colors + Shades
    notVoteColor = this.options.notVoteColor || "#313534";
    balanceColor = this.options.balanceColor || "#313534";
    orientation = Orientation.VERTICAL;

    @styleRule
    container = {
        height: "40px",
        width: "100%",
        fontSize: "14px",
        color: "#767676",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
    };

    mainClass = {
        height: "40px",
        lineHeight: "40px",
        fontSize: "14px",
        color: "#767676",
        display: "inline-block",
        float: "right",
        textAlign: "right",
    };

    thumbsStyle = {
        fontSize: this.height / 2 + "px",
        lineHeight: this.height + "px",
    };

    @styleRule
    displayStyle = {
        display: "inline-block",
        float: "left",
        paddingLeft: "3px",
    };

    counterStyle = {
        fontSize: 18 * this.size + "px",
        fontWeight: "900",
        color: this.balanceColor,
    };

    @styleRule
    thumbsUpHoverStyle = {
        transition: ".25s",
        ":hover": {
            color: this.likeColor,
            opacity: ".8",
            transition: ".25s",
        }
    };

    @styleRule
    thumbsDownHoverStyle = {
        transition: ".25s",
        ":hover": {
            color: this.dislikeColor,
            opacity: ".8",
            transition: ".25s",
        }
    };

    @styleRule
    padding = {
        width: "3px",
        float: "left",
        display: "inline-block",
        height: this.height + "px",
    };
}

export {VotingWidgetStyle}