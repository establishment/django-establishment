import {StyleSheet, styleRule, styleRuleInherit} from "UI";


class ChatStyle extends StyleSheet {
    navbarHeight = "50px";
    renderMessageHeight = "100px";

    userFontSize = "1.1em";
    commentFontSize = "1.1em";

    backgroundColor = "#fff";
    hrBackgroundColor = "#ddd";
    hoverBackgroundColor = "#f8f8f8";

    @styleRule
    renderMessageView = {
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        backgroundColor: this.backgroundColor,
        position: "relative",
        wordBreak: "break-word",
    };

    @styleRule
    renderMessage = {
        height: this.renderMessageHeight,
        maxHeight: this.renderMessageHeight,
        width: "100%",
        borderTop: "1px solid " + this.hrBackgroundColor,
        backgroundColor: this.backgroundColor,
        position: "relative",
    };

    @styleRule
    chatInput = {
        height: "100%",
        width: "calc(100% - 50px)",
        // "line-height": "30px",
        paddingTop: "0",
        paddingBottom: "0",
        fontSize: "14px",
        borderRadius: "0",
        paddingLeft: "8px",
        border: "0px",
        paddingTop: "5px",
        resize: "none",
        transition: ".2s",
        display: "inline-block",
        float: "left",
        outline: "none",
        position: "absolute",
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
    messageBoxButton = {
        textAlign: "center",
        flex: "1",
        backgroundColor: "#fff",
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
        ":hover:active": {
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
        color: "#333",
        borderRadius: "0",
        borderBottom: "0",
        backgroundColor: "#eee",
        padding: "5px 10px",
        textTransform: "uppercase",
        marginTop: "15px",
    };

    @styleRule
    messageTimeStampHr = {
        height: "1px",
        marginTop: "1.5em",
        marginBottom: "1.5em",
        width: "100%",
        maxWidth: "100%",
        backgroundColor: this.hrBackgroundColor,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textTransform: "uppercase",
    };

    @styleRule
    messageTimeStamp = {
        height: "1.5em",
        width: "auto",
        paddingLeft: "10px",
        paddingRight: "10px",
        backgroundColor: this.backgroundColor,
        textAlign: "center",
        color: "#222",
        fontWeight: "bold",
    };

    @styleRule
    groupChatMessage = {
        width: "100%",
        backgroundColor: "#fff",
    };

    @styleRule
    comment = {
        paddingLeft: "12px",
        paddingRight: "12px",
        paddingTop: "12px",
        paddingBottom: "12px",
        ":hover": {
            backgroundColor: this.hoverBackgroundColor,
        },
    };

    @styleRule
    userHandle = {
        fontSize: this.userFontSize,
    };

    @styleRule
    commentContent = {
        " p": {
            marginTop: "0",
            marginBottom: "0",
            fontSize: this.commentFontSize,
            color: "#454545",
            // textAlign: "justify",
            wordWrap: "break-word",
        },
    };

    @styleRule
    timestamp = {
        color: "#262626",
        fontWeight: "bold",
        margin: "0 10px",
    };
}

export {ChatStyle};
