import {StyleSet} from "Style";
import {styleRule, styleRuleInherit} from "decorators/Style";


class ForumThreadReplyStyle extends StyleSet {
    @styleRule
    mainClass = {
        width: "100%",
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
    }

    @styleRule
    repliesUserAndDate = {
        height: "40px",
        width: "100%",
        lineHeight: "40px",
        fontSize: "15px",
        marginTop: "8px",
        marginBottom: "8px",
        fontFamily: "montserrat",
    };

    @styleRule
    repliesUser = {
        display: "inline-block",
        float: "left",
        color: "#444",
        fontSize: "14px",
        fontFamily: "montserrat",
    };

    @styleRule
    repliesDate = {
        display: "inline-block",
        float: "right",
        fontFamily: "montserrat",
    };

    @styleRule
    repliesContent = {
        marginBottom: "15px",
        fontSize: "16px",
    };
}


let height = 70;

class ForumThreadPanelStyle extends StyleSet {
    @styleRule
    mainClass = {
        marginTop: "-20px",
        marginBottom: "20px",
        width: "100%",
        maxWidth: "1200px",
        marginLeft: "auto",
        marginRight: "auto",
    };

    @styleRule
    backButton = {
        paddingLeft: "16px",
        color: "#444",
        textDecoration: "none",
        display: "inline-block",
        float: "left",
        lineHeight: () => height + "px",
        fontSize: "22px",
        transition: ".25s",
        textAlign: "center",
        ":hover": {
            opacity: "1",
            color: "#6436466",
            transition: ".25s",
        },
    }

    @styleRule
    fullPost = {
        backgroundColor: "#f3f3f3",
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
    title = {
        height: height + "px",
        lineHeight: height + "px",
        width: "70%",
        maxWidth: "70%",
        wordWrap: "break-word",
        textAlign: "justify",
        color: "#464948",
        verticalAlign: "middle",
        display: "inline-block",
        float: "left",
        paddingLeft: "16px",
        paddingRight: "4px",
    };

    @styleRule
    titleSpan = {
        display: "inline-block",
        verticalAlign: "middle",
        maxWidth: "100%",
    };

    @styleRule
    author = {
        height: () => height + "px",
        lineHeight: () => height + "px",
        color: "#444",
        marginBottom: "25px",
        display: "inline-block",
        float: "right",
        fontSize: "13px",
        paddingRight: "16px",
    };

    @styleRule
    header = {
        minHeight: height + "px",
        maxHeight: 2 * height + "px",
        borderBottom: "2px solid #e4e6e7",
    };

    @styleRule
    message = {
        paddingLeft: "16px",
        paddingRight: "16px",
        fontSize: "16px",
        marginBottom: "25px",
        paddingTop: "25px",
        color: "#323232",
    };

    @styleRule
    buttons = {
        height: "50px",
        width: "100%",
        paddingTop: "12px",
    };

    @styleRule
    numRepliesAndVoting = {
        height: "40px",
        width: "100%",
    };

    @styleRule
    voting = {
        paddingRight: "16px",
    };

    @styleRule
    numReplies = {
        height: "40px",
        lineHeight: "40px",
        fontSize: "14px",
        paddingLeft: "16px",
        color: "#767676",
        display: "inline-block",
        float: "left",
        fontFamily: "montserrat",
    };

    @styleRule
    replies = {
        paddingLeft: "16px",
        paddingRight: "16px",
        width: "100%",
        borderTop: "2px solid #e4e6e7",
        color: "#444",
    };
}


class ButtonStyle extends StyleSet {
    @styleRule
    button = {
        marginLeft: "16px",
        color: "#fff",
        height: "30px",
        marginTop: "10px",
        marginBottom: "20px",
        width: "auto",
        borderRadius: "0px",
        backgroundColor: "#333",
        border: "0",
        padding: "5px 10px",
        marginBottom: "0",
        borderColor: "#333",
        fontFamily: "montserrat",
        fontSize: "13px",
        transition: ".2s",
        ":hover": {
            backgroundColor: "#454545",
            borderColor: "#454545",
            transition: ".2s",
        },
        ":active": {
            backgroundColor: "#454545",
            borderColor: "#454545",
            transition: ".2s",
        },
        ":focus": {
            backgroundColor: "#454545",
            borderColor: "#454545",
            transition: ".2s",
        },
    };

}


class ForumThreadHeaderStyle extends StyleSet {
    constructor() {
        super({
            updateOnResize: true,
        });
    }

    fontSize = "0.8em";
    widthLimit = 800;

    tagsHeight = 50;
    primaryFont = "lato";
    // borderTopColor = "rgb(232, 189, 35)";
    borderTopColor = "#333";

    baseStyleObject = {
        height: this.tagsHeight + "px",
        // display: "inline-block",
        // float: "left",
        fontFamily: this.primaryFont,
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


class ForumThreadPreviewStyle extends StyleSet {
    // functionality
    maxHeight = 50;
    lines = 2;
    lineHeight = this.maxHeight / this.lines;

    // design
    fontSize = ".75em";
    color = "#aaa";

    @styleRule
    forumThreadPreview = {
        maxHeight: this.maxHeight + "px",
        lineHeight: this.lineHeight + "px",
        overflow: "hidden",
        fontSize: this.fontSize,
        color: this.color,
    };
}


class ForumThreadBubbleStyle extends StyleSet {
    constructor() {
        super({
            updateOnResize: true,
        });
    }

    primaryFont = "lato";
    secondaryFont = "montserrat";
    titlePaddingBottom = "10px";
    widthLimit = 800;

    baseStyleObject = {
        display: "inline-block",
        verticalAlign: "top",
        fontFamily: this.primaryFont,
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
        border: "1px solid #f2f2f2",
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
            color: "#286090",
            transition: "0.2s",
        }
    };

    @styleRule
    threadAuthor = [this.baseStyleObject, {
        // width: "14%",
        // maxWidth: "14%",
        flex: ".7",
        // paddingLeft: "8px",
        fontSize: "14px",
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
        fontSize: "14px",
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
            color: "#286090",
            transition: "0.2s",
        }
    };

    @styleRule
    threadViews = [this.baseStyleObject, {
        // width: "8%",
        flex: ".5",
        fontSize: "14px",
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
        fontSize: "14px",
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
        fontSize: "13px",
        textAlign: "center",
        color: "#767676",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: "4px",
        paddingRight: "12px",
    }];
}


class ForumPanelStyle extends StyleSet {
    textColor = "#424242";
    headerItemHeight = 50;
    primaryFont = "raleway";
    secondaryFont = "montserrat";

    @styleRule
    mainClass = {
        width: "100%",
    };

    @styleRule
    title = {
        width: "100%",
        // textAlign: "center",
        fontSize: "2em",
        fontFamily: this.primaryFont,
        color: this.textColor,
        height: this.headerItemHeight + "px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    };

    @styleRule
    buttonParent = {
        width: "100%",
        height: this.headerItemHeight + "px",
        display: "flex",
        justifyContent: "center",
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
