import {StyleSet} from "Style";
import {styleRule, styleRuleInherit} from "decorators/Style";


class ChatStyle extends StyleSet {
    navbarHeight = "45px";
    renderMessageHeight = "100px";

    primaryFont = "montserrat";
    secondaryFont = "raleway";

    backgroundColor = "#fff";
    hrBackgroundColor = "#ddd";
    hoverBackgroundColor = "#f6f6f6";

    @styleRule
    renderMessageView = {
        height: `calc(100vh - ${this.navbarHeight} - ${this.renderMessageHeight})`,
        maxHeight: `calc(100vh - ${this.navbarHeight} - ${this.renderMessageHeight})`,
        minHeight: `calc(${this.navbarHeight} + ${this.renderMessageHeight})`,
        width: "100%",
        overflowY: "auto",
    };

    @styleRule
    renderMessage = {
        height: this.renderMessageHeight,
        maxHeight: this.renderMessageHeight,
        width: "100%",
        borderTop: "1px solid " + this.hrBackgroundColor,
    };

    @styleRule
    chatInput = {
        height: this.renderMessageHeight,
        width: "calc(100% - 50px)",
        // "line-height": "30px",
        paddingTop: "0",
        paddingBottom: "0",
        fontSize: "14px",
        borderRadius: "0",
        fontFamily: "raleway",
        paddingLeft: "8px",
        border: "0px",
        paddingTop: "5px",
        resize: "none",
        transition: ".2s",
        display: "inline-block",
        float: "left",
        outline: "none",
        ":focus": {
            outline: "none",
            boxShadow: "none",
        },
        ":active": {
            outline: "none",
            boxShadow: "none",
        },
    };

    @styleRule
    sendMessageButton = {
        height: "50px",
        lineHeight: "50px",
        textAlign: "center",
        width: "50px",
        display: "inline-block",
        float: "left",
        borderRadius: "100%",
        backgroundColor: "#fff",
        fontFamily: this.primaryFont,
        border: "0",
        fontSize: "18px",
        transition: ".2s",
        color: "#333",
        padding: "0",
        ":hover": {
            backgroundColor: "transparent",
            color: "#2089b5",
            transition: ".2s",
        },
        ":active": {
            backgroundColor: "transparent",
            color: "#2089b5",
            transition: ".2s",
        },
        ":focus": {
            backgroundColor: "transparent",
            color: "#2089b5",
            transition: ".2s",
            outline: "none",
        },
        ":focus:active": {
            backgroundColor: "transparent",
            color: "#2089b5",
        },
    };

    previewButton = { // TODO: This is currently not restyled.
        // We might not want to use it because previewButton is bad practice
        height: "30px",
        width: "30px",
        borderRadius: "100%",
        fontSize: "100%",
        marginLeft: "5px",
    };

    loadMoreButton = {
        border: "0px",
        fontFamily: this.primaryFont,
        color: "#333",
        borderRadius: "0",
        borderBottom: "0",
        backgroundColor: "#eee",
        padding: "5px 10px",
    };

    @styleRule
    messageTimeStampHr = {
        height: "1px",
        marginTop: "1.5em",
        marginBottom: "1.5em",
        width: "100%",
        backgroundColor: this.hrBackgroundColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };

    @styleRule
    messageTimeStamp = {
        height: "1.5em",
        width: "auto",
        paddingLeft: "10px",
        paddingRight: "10px",
        backgroundColor: this.backgroundColor,
        textAlign: "center",
        fontFamily: this.primaryFont,
        color: "#222",
    };

    @styleRule
    groupChatMessage = {
        // backgroundColor: "blue",
    };
    
    @styleRule
    comment = {
        paddingLeft: "25px",
        paddingRight: "25px",
        paddingTop: "10px",
        paddingBottom: "10px",
        ":hover": {
            backgroundColor: this.hoverBackgroundColor,
        },
    };

    @styleRule
    commentContent = {
        " p": {
            marginTop: "0",
            marginBottom: "0",
        },
    };

    @styleRule
    timestamp = {
        fontFamily: this.secondaryFont,
        margin: "0 10px",
    };
}


export {ChatStyle};
