import {StyleSheet, styleRule, styleRuleInherit} from "UI";
//import {CSAStyle} from "CSAStyle";

const colors = {
    // BLUE: "#20232d",
    BLUE: "#202e3e",
    HOVER_BLUE: "#364251",
    // BLACK: "#181a22",
    BLACK: "#1c2937",
    // HOVER_BLACK: "#323539",
    HOVER_BLACK: "#364251",
    WHITE: "#eee",
};


class ForumThreadReplyStyle extends StyleSheet {

    @styleRule
    mainClass = {
        width: "90%",
        margin: "0 auto",
        maxWidth: "1200px",
    }

    @styleRule
    repliesUserAndDate = {
        height: "40px",
        width: "100%",
        lineHeight: "40px",
        fontSize: "15px",
        marginTop: "8px",
        marginBottom: "8px",
    };

    @styleRule
    repliesUser = {
        display: "inline-block",
        float: "left",
        color: "#444",
        fontSize: "14px",
    };

    @styleRule
    repliesDate = {
        display: "inline-block",
        float: "right",
    };

    @styleRule
    repliesContent = {
        marginBottom: "15px",
        fontSize: "16px",
    };
}


let height = 70;

class ForumThreadPanelStyle extends StyleSheet {
    fontSize = "0.9em";
    numRepliesFontSize = "1.03em";
    messageFontSize = "1.2em";
    buttonFontSize = "1em";

    @styleRule
    mainClass = {
        margin: "0 auto",
        marginBottom: "20px",
        width: "100%",
    };

    @styleRule
    title = {
        width: "90%",
        maxWidth: "1200px",
        margin: "0 auto",
        fontSize: "2em",
        color: "#333",
        minHeight: "50px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };

    @styleRule
    backButton = {
        color: "#444",
        fontSize: this.fontsize,
        textDecoration: "none",
        transition: ".15s",
        opacity: "1",
        ":hover": {
            opacity: "1",
            color: "#337ab7",
            transition: ".15s",
        },
    };

    @styleRule
    replyButtonDiv = {
        width: "90%",
        maxWidth: "1200px",
        height: "50px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        margin: "0 auto",
    };

    @styleRule
    replyButton = {
        margin: "0",
    };

    @styleRule
    fullPost = {
        width: "90%",
        maxWidth: "1200px",
        margin: "0 auto",
        fontSize: this.fontSize,
        border: "1px solid #ddd",
        borderTop: "0",
    };

    @styleRule
    dislikeButton = {
        display: "inline-block",
        float: "right",
        marginRight: "16px",
    };

    @styleRule
    likeButton = {
        display: "inline-block",
        float: "right",
        marginRight: "8px",
    };

    @styleRule
    author = {
        color: "#262626",
        fontSize: this.fontSize,
        height: "50px",
        display: "flex",
        alignItems: "center",
        paddingLeft: "0",
        // justifyContent: "center",
        textTransform: "uppercase",
        // fontWeight: "bold",
    };

    @styleRule
    header = {
    };

    @styleRule
    message = {
        padding: "5px 12px",
        fontSize: this.messageFontSize,
        color: colors.BLUE,
        " p": {
            marginBottom: "0",
            padding: "5px 0",
        },
    };

    @styleRule
    buttons = {
        height: "50px",
        width: "100%",
        paddingTop: "12px",
    };

    @styleRule
    bottomPanel = {
        height: "50px",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    };

    @styleRule
    voting = {
        paddingRight: "12px",
    };

    @styleRule
    numReplies = {
        height: "50px",
        fontSize: this.numRepliesFontSize,
        paddingLeft: "12px",
        color: "#767676",
        display: "flex",
        alignItems: "center",
        fontWeight: "bold",
        textTransform: "uppercase",
    };

    @styleRule
    replies = {
        width: "100%",
        color: "#444",
    };

    @styleRule
    editDeleteButtons = {
        width: "100%",
        height: "50px",
        padding: "0 7px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
    };

    @styleRule
    editButton = {
        height: "35px",
        width: "35px",
        margin: "0 4px",
        border: "0",
        borderRadius: "0",
        color: "#fff",
        backgroundColor: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: this.buttonFontSize,
        transition: ".2s",
        ":hover": {
            backgroundColor: "#454545",
            transition: ".2s",
        },
    };

    @styleRule
    deleteButton = {
        height: "35px",
        width: "35px",
        margin: "0 4px",
        border: "0",
        borderRadius: "0",
        color: "#fff",
        backgroundColor: "#333",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: this.buttonFontSize,
        transition: ".2s",
        ":hover": {
            backgroundColor: "#454545",
            transition: ".2s",
        },
    };
}


class ButtonStyle extends StyleSheet {
    @styleRule
    button = {
        marginLeft: "16px",
        color: "#fff",
        height: "30px",
        marginTop: "10px",
        marginBottom: "20px",
        width: "auto",
        borderRadius: "0px",
        backgroundColor: colors.BLUE,
        border: "0",
        padding: "5px 10px",
        marginBottom: "0",
        borderColor: colors.BLUE,
        fontSize: "13px",
        transition: ".2s",
        outline: "none",
        ":hover": {
            backgroundColor: colors.HOVER_BLUE,
            borderColor: colors.HOVER_BLUE,
            transition: ".2s",
        },
        ":active": {
            backgroundColor: colors.HOVER_BLUE,
            borderColor: colors.HOVER_BLUE,
            transition: ".2s",
        },
        ":focus": {
            backgroundColor: colors.HOVER_BLUE,
            borderColor: colors.HOVER_BLUE,
            transition: ".2s",
        },
    };

}


class ForumThreadHeaderStyle extends StyleSheet {
    constructor() {
        super({
            updateOnResize: true,
        });
    }

    fontSize = "0.85em";
    widthLimit = 800;

    tagsHeight = 50;
    // borderTopColor = "rgb(232, 189, 35)";
    borderTopColor = "#333";

    baseStyleObject = {
        height: this.tagsHeight + "px",
        // display: "inline-block",
        // float: "left",
        color: "#262626",
        // letterSpacing: "-0.3px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textTransform: "uppercase",
        fontWeight: "bold",
    };
    
    @styleRule
    mainClass = {
        height: "40px",
        width: "100%",
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
        // borderBottom: "2px solid #333",// + this.borderTopColor,
        color: "#aaa",
        display: "flex",


        boxSizing: "content-box",
        backgroundColor: "#eaeaea",
        height: this.tagsHeight + "px",
        borderTop: "3px solid " + this.borderTopColor,
    };

    @styleRule
    tagsTitle = [this.baseStyleObject, {
        // marginLeft: "1%",
        // width: "40%",
        paddingLeft: "12px",
        flex: () => {
            if (window.innerWidth < this.widthLimit) {
                return "1.5";
            }
            return "3";
        },
        justifyContent: "initial",
        fontSize: this.fontSize,
    }];

    @styleRule
    tagsAuthor = [this.baseStyleObject, {
        // width: "14%",
        paddingLeft: "4px",
        paddingRight: "4px",
        flex: ".7",
        textAlign: "center",
        fontSize: this.fontSize,
    }];

    @styleRule
    tagsReplies = [this.baseStyleObject, {
        paddingLeft: "4px",
        paddingRight: "4px",
        // width: "8%",
        paddingLeft: "4px",
        paddingRight: "4px",
        flex: ".5",
        textAlign: "center",
        fontSize: this.fontSize,
    }];

    @styleRule
    tagsViews = [this.baseStyleObject, {
        // width: "8%",
        paddingLeft: "4px",
        paddingRight: "4px",
        flex: ".5",
        textAlign: "center",
        fontSize: this.fontSize,
        display: () => {
            console.log(window.innerWidth);
            if (window.innerWidth < this.widthLimit) {
                return "none";
            }
            return "inherit";
        },
    }];

    @styleRule
    tagsVotes = [this.baseStyleObject, {
        // width: "8%",
        paddingLeft: "4px",
        paddingRight: "4px",
        flex: ".5",
        textAlign: "center",
        fontSize: this.fontSize,
        display: () => {
            if (window.innerWidth < this.widthLimit) {
                return "none";
            }
            return "inherit";
        },
    }];

    @styleRule
    tagsActivity = [this.baseStyleObject, {
        // width: "20%",
        paddingLeft: "4px",
        paddingRight: "12px",
        flex: ".5",
        textAlign: "center",
        fontSize: this.fontSize,
    }];
}


class ForumThreadPreviewStyle extends StyleSheet {
    // functionality
    maxHeight = 50;
    lines = 2;
    lineHeight = this.maxHeight / this.lines;

    // design
    fontSize = ".88em";
    color = "#aaa";

    @styleRule
    forumThreadPreview = {
        maxHeight: this.maxHeight + "px",
        lineHeight: this.lineHeight + "px",
        overflow: "hidden",
        fontSize: this.fontSize,
        color: this.color,
        " *": {
            marginBottom: "0",
        },
    };
}


class ForumThreadBubbleStyle extends StyleSheet {
    constructor() {
        super({
            updateOnResize: true,
        });
    }

    fontSize = "1em";
    titlePaddingBottom = "10px";
    widthLimit = 800;

    baseStyleObject = {
        display: "inline-block",
        verticalAlign: "top",
        fontSize: this.fontSize,
    };

    @styleRule
    backgroundColorOddInstances = {
        backgroundColor: "#f4f6f7",
        ":hover": {
            backgroundColor: "#eff1f2",
        },
    };

    @styleRule
    backgroundColorPinnedInstances = {
        backgroundColor: "#f4f6f7",
        ":hover": {
            backgroundColor: "#eff1f2",
        },
    };

    @styleRule
    backgroundColorEvenInstances = {
        backgroundColor: "#fff",
        ":hover": {
            backgroundColor: "#fafafa",
        }
    };

    @styleRule
    mainClass = {
        width: "100%",
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
        color: "#555",
        border: "1px solid #ddd",
        borderTop: "0",
        display: "flex",
    };

    @styleRule
    threadTitleAndPreview = {
        flexDirection: "column",
        flex: () => {
            if (window.innerWidth < this.widthLimit) {
                return "1.5";
            }
            return "3";
        },
        paddingTop: "25px",
        paddingBottom: "25px",
        paddingLeft: "12px",
    }

    @styleRule
    threadTitle = [this.baseStyleObject, {
        // width: "40%",
        // maxWidth: "50%",
        // flex: "1.5",
        flexDirection: "column",
        textAlign: "justify",
        // paddingRight: "8px",
        verticalAlign: "middle",
        wordWrap: "break-word",
        color: "#252628",
        paddingBottom: this.titlePaddingBottom,
    }];

    @styleRule
    pinnedIcon = {
        textAlign: "center",
        display: "inline-block",
        float: "left",
        height: "60px",
        paddingTop: "25px",
        paddingRight: "12px",
    };

    @styleRule
    threadTitleSpan = {
        display: "inline-block",
        verticalAlign: "middle",
        lineHeight: "20px",
        // maxWidth: "95%",
        transition: "0.2s",
        fontSize: "1.2em",
        ":hover": {
            color: "#337ab7",
            transition: "0.2s",
        }
    };

    @styleRule
    threadAuthor = [this.baseStyleObject, {
        // width: "14%",
        // maxWidth: "14%",
        flex: ".7",
        // paddingLeft: "8px",
        textAlign: "center",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "4px",
    }];

    @styleRule
    threadReplies = [this.baseStyleObject, {
        // width: "8%",
        flex: ".5",
        textAlign: "center",
        fontWeight: "bold",
        color: "#767676",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "4px",
    }];

    @styleRule
    threadRepliesSpan = {
        transition: "0.2s",
        ":hover": {
            color: "#337ab7",
            transition: "0.2s",
        }
    };

    @styleRule
    threadViews = [this.baseStyleObject, {
        // width: "8%",
        flex: ".5",
        textAlign: "center",
        color: "#767676",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "4px",
        display: () => {
            if (window.innerWidth < this.widthLimit) {
                return "none";
            }
            return "inherit";
        },
    }];

    @styleRule
    threadVotes = [this.baseStyleObject, {
        // width: "8%",
        flex: ".5",
        textAlign: "center",
        color: "#767676",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "4px",
        display: () => {
            if (window.innerWidth < this.widthLimit) {
                return "none";
            }
            return "inherit";
        },
    }];

    @styleRule
    threadActivity = [this.baseStyleObject, {
        // width: "20%",
        flex: ".5",
        textAlign: "center",
        color: "#767676",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "12px",
        fontSize: ".85em",
    }];
}


class ForumPanelStyle extends StyleSheet {
    textColor = "#333";
    headerItemHeight = 50;

    @styleRule
    mainClass = {
        width: "100%",
    };

    @styleRule
    title = {
        width: "100%",
        // textAlign: "center",
        fontSize: "2em",
        color: this.textColor,
        height: this.headerItemHeight + "px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };

    @styleRule
    buttonParent = {
        width: "90%",
        maxWidth: "1200px",
        margin: "0 auto",
        height: this.headerItemHeight + "px",
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
    };

    @styleRule
    button = {
        margin: "0",
    };

    @styleRule
    header = {
        height: 2 * this.headerItemHeight + "px",
        width: "100%",
    };
}


export {
    ForumThreadReplyStyle, 
    ForumThreadPanelStyle, 
    ButtonStyle, 
    ForumThreadHeaderStyle, 
    ForumThreadPreviewStyle,
    ForumThreadBubbleStyle, 
    ForumPanelStyle
};
