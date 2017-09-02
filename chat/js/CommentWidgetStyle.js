import {StyleSheet, styleRule} from "UI";

class CommentWidgetStyle extends StyleSheet {
    loadMoreButton = {
        border: "0px",
        color: "#333",
        borderRadius: "0",
        borderBottom: "0",
        backgroundColor: "#eee",
        padding: "5px 10px",
    };

    writingSectionStyle = {
        height: "auto",
        marginTop: "10px",
    };

    @styleRule
    chatInputStyle = {
        height: "30px",
        width: "100%",
        paddingBottom: "0",
        fontSize: "14px",
        borderRadius: "0",
        outline: "none",
        paddingLeft: "8px",
        paddingTop: "5px",
        resize: "none",
        transition: ".2s",
        display: "block",
        border: "1px solid #aaa",
        ":focus": {
            height: "120px",
            transition: ".2s",
        },
        ":active": {
            height: "120px",
            transition: ".2s",
        },
    };

    @styleRule
    chatInputMax = {
        height: "120px",
    };

    previewButtonStyle = { // TODO: This is currently not restyled. We might not want to use it because previewButton is bad practice
        height: "30px",
        width: "auto",
        fontSize: "100%",
        marginLeft: "5px",
    };
}

export {CommentWidgetStyle}