import {StyleSheet, styleRule} from "UI";

class DocumentationStyle extends StyleSheet {
    constructor() {
        super({updateOnResize: true});
    }

    @styleRule
    panel = {
        height: "100%"
    };

    @styleRule
    navPanel = {
        width: "20%",
        maxWidth: "20%",
        height: "100%",
        display: "inline-block",
        float: "left",
        backgroundColor: "#f2f4f9",
        color: "#252525",
        overflowX: "auto",
        overflowY: "auto",
    };

    @styleRule
    article = {
        minWidth: "80%",
        maxWidth: "80%",
        backgroundColor: "#f2f4f9",
        minHeight: "100%",
        maxHeight: "100%",
        height: "100%",
        display: "inline-block",
        overflowX: "hidden",
        overflowY: "scroll",
    };

    @styleRule
    articleSwitcher = {
        width: "960px",
        maxWidth: "100%",
        textAlign: "justify", // TODO: DO WE WANT THIS ?
        paddingTop: "25px", // TODO: HERE, A BETTER PADDING
        paddingBottom: "30px",
        minHeight: "100%",
        marginBottom: "-5px",
        display: "inline-block",
        paddingLeft: "5%",
        paddingRight: "5%",
        backgroundColor: "#fff",
        height: "auto !important",
    };

    @styleRule
    navElementDiv = {
        fontSize: "14px",
        paddingLeft: "12px",
        paddingTop: ".75em",
        paddingBottom: ".75em",
    };

    @styleRule
    documentationPanel = {
        height: () => (window.innerHeight - 45) + "px",
        overflow: "hidden",
        position: "absolute",
        minWidth: "100%",
        maxWidth: "100%",
        backgroundColor: "#fff",
    };
}

export {DocumentationStyle};