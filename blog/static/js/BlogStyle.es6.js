import {StyleSet} from "Style";
import {styleRule, styleRuleInherit} from "decorators/Style";


class BlogStyle extends StyleSet {
    @styleRule
    commentsTitle = {
        fontFamily: "montserrat",
        height: "20px",
        color: "#333",
        fontSize: "16px",
        marginTop: "10px",
    };

    @styleRule
    bottomSection = {
        marginTop: "5px",
        height: "50px",
        width: "100%",
    }

    @styleRule
    blogEntryView = {
        "font-size": "raleway",
        "margin": "0 auto",
        "width": "900px",
        "max-width": "100%",
        // "padding-top": "50px",
        // "padding-bottom": "50px",
    };

    title = {
        "font-size": "44px",
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
        "font-family": "montserrat",
        "font-size": "12px",
        "color": "#666",
    };

    article = {
        "text-align": "justify",
        "font-family": "raleway",
        "font-size": "17px",
    };

    link = {
        "text-decoration": "none",
        "text-align": "center",
        "font-style": "italic",
        "font-family": "montserrat",
        position: "absolute",
        marginTop: "-15pt",
        fontSize: "125%",
    };

    blogArticleRenderer = {
        overflow: "hidden",
        position: "relative",
        maxHeight: "180px",
        "text-align": "justify",
        "font-family": "raleway",
        "font-size": "17px",
    };

    @styleRule
    whiteOverlay = {
        width: "100%",
        height: "100px",
        background: "-webkit--linear-gradient(rgba(255,255,255,0), #fff)",
        background: "-o-linear-gradient(rgba(255,255,255,0), #fff)",
        background: "-moz-linear-gradient(rgba(255,255,255,0), #fff)",
        background: "linear-gradient(rgba(255,255,255,0), #fff)",
        position: "absolute",
        "margin-top": "-100px",
        "pointer-events": "none",
        width: "92%",
    };
}


class BlogArticleRendererStyle extends StyleSet {
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
