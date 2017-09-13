import {StyleSheet, styleRule, styleRuleInherit} from "UI";

const color = {
    BLUE: "#20232d",
    HOVER_BLUE: "#364251",
    BLACK: "#181a22",
    HOVER_BLACK: "#323539",
    WHITE: "#eee",
};

let CSAStyle = {
    color: color,
};

class BlogStyle extends StyleSheet {
    titleFontSize = "2em";

    @styleRule
    commentsTitle = {
        height: "20px",
        color: "#333",
        marginTop: "10px",
        fontSize: "1em",
        textTransform: "uppercase",
    };

    @styleRule
    bottomSection = {
        marginTop: "5px",
        height: "50px",
        width: "100%",
    };

    @styleRule
    blogEntryView = {
        "margin": "0 auto",
        "width": "900px",
        "max-width": "100%",
        // "padding-top": "50px",
        // "padding-bottom": "50px",
    };

    title = {
        "font-size": this.titleFontSize,
        "padding-top": "20px",
        "padding-bottom": "10px",
        "text-decoration": "italic",
        "width": "100%",
        "text-align": "center",
        "word-wrap": "normal",
        "line-height": "60px",
    };

    writtenBy = {
        "width": "100%",
        "text-align": "left",
        "padding-top": "20px",
        "font-size": "1em",
        "color": "#666",
    };

    article = {
        "text-align": "justify",
        "font-size": "17px",
    };

    link = {
        textDecoration: "none",
        textAlign: "center",
        marginTop: "-15pt",
        fontSize: "1.1em",
    };

    blogArticleRenderer = {
        overflow: "hidden",
        position: "relative",
        maxHeight: "180px",
        "text-align": "justify",
        "font-size": "17px",
        marginBottom: "25px",
    };

    @styleRule
    whiteOverlay = {
        height: "100px",
        background: "linear-gradient(rgba(255,255,255,0), #fff)",
        position: "absolute",
        marginTop: "-120px",
        pointerEvents: "none",
        width: "92%",
    };

    @styleRule
    loadMoreButton = {
        marginLeft: "16px",
        color: "#fff",
        height: "40px",
        marginTop: "10px",
        marginBottom: "20px",
        width: "auto",
        borderRadius: "0px",
        backgroundColor: CSAStyle.color.BLUE,
        border: "0",
        padding: "5px 10px",
        borderColor: CSAStyle.color.BLUE,
        fontSize: "1em",
        transition: ".2s",
        textTransform: "uppercase",
        opacity: "1",
        ":hover": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":active": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":focus": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":active:focus": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
    };

    @styleRule
    sendMessageButtonStyle = {
        height: "30px",
        marginTop: "10px",
        marginBottom: "20px",
        width: "auto",
        borderRadius: "0px",
        backgroundColor: CSAStyle.color.BLUE,
        borderColor: "#333",
        fontSize: "13px",
        transition: ".2s",
        ":hover": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":active": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":focus": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
        ":focus:active": {
            backgroundColor: CSAStyle.color.HOVER_BLUE,
            borderColor: CSAStyle.color.HOVER_BLUE,
            transition: ".2s",
        },
    };
}


class BlogArticleRendererStyle extends StyleSheet {
    hStyle = {
        "text-align": "center",
        "margin-top": "30px",
        "margin-bottom": "30px",
        "width": "100%",
    };

    @styleRule
    blogArticleRenderer = {
        " h1": this.hStyle,
        " h2": this.hStyle,
        " h3": this.hStyle,
        " h4": this.hStyle,
        " h5": this.hStyle,
        " h6": this.hStyle,
    };

    @styleRule
    quote = {
        "font-style": "italic",
        "margin-top": "20px",
        "margin-bottom": "20px",
        "color": "#707070",
        "float": "right",
        "display": "flex",
        "width": "100%",
    };
}


export {BlogStyle, BlogArticleRendererStyle};
