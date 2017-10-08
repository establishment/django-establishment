import {StyleSheet, styleRule} from "UI";
import {Device} from "Device";


let loginHeight = 500;
let registerHeight = 500;
let width = 500;
let buttonHeight = 60;
let fontAwesomeIconHeight = 40;
let fontAwesomeIconWidth = 60;
let textColor = "#252525";
let signInButtonHeight = 50;
let signInButtonWidth = 120;


class LoginStyle extends StyleSheet {

    @styleRule
    loginRegisterSystem = () => {
        if (Device.isTouchDevice()) {
            console.log("Touch device mode on");
            return {
                position: "absolute",
                height: loginHeight + "px",
                width: width + "px",
                backgroundColor: "#fff",
                maxHeight: "100%",
                maxWidth: "100%",
            };
        } else {
            return {
                maxWidth: "100%",
                height: loginHeight + "px",
                width: width + "px",
                margin: "0 auto",
                backgroundColor: "#fff",
            };
        }
    };

    @styleRule
    loginRegisterButtons = {
        display: "inline-block",
        float: "left",
        width: "100%",
        height: buttonHeight / loginHeight * 100 + "%",
    };

    @styleRule
    loginSystemButton = {
        // height: buttonHeight + "px",
        height: "100%",
        // lineHeight: buttonHeight / loginHeight * 100 + "%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "100%",
        width: "50%",
        backgroundColor: "#f6f6f6",
        color: textColor,
        border: "1px solid #d3d5d9",
        cursor: "pointer",
        float: "left",
        borderLeft: "0",
        borderTop: "0",
        textTransform: "uppercase",
        fontSize: "1.1em",
    };

    @styleRule
    registerSystemButton = {
        // height: buttonHeight + "px",
        height: "100%",
        // lineHeight: buttonHeight / loginHeight * 100 + "%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        fontSize: "100%",
        width: "50%",
        backgroundColor: "#f6f6f6",
        color: textColor,
        border: "1px solid #d3d5d9",
        cursor: "pointer",
        float: "left",
        borderRight: "0",
        borderTop: "0",
        textTransform: "uppercase",
        fontSize: "1.1em",
    };

    selectedLeft = {
        borderBottom: "0",
        borderRight: "0",
        backgroundColor: "#fff",
        fontWeight: "bold",
    };

    @styleRule
    selectedLeftClass = {
        borderBottom: "0",
        borderRight: "0",
        backgroundColor: "#fff",
    };

    selectedRight = {
        borderBottom: "0",
        borderLeft: "0",
        backgroundColor: "#fff",
        fontWeight: "bold",
    };

    @styleRule
    selectedRightClass = {
        borderBottom: "0",
        borderLeft: "0",
        backgroundColor: "#fff",
    };

    @styleRule
    loginWidget = {
        height: loginHeight - buttonHeight + "px",
        width: width + "px",
        maxWidth: "100%",
        padding: "5% 10%",
        color: textColor,
        borderTop: "0px solid #d3d5d9",
    };

    @styleRule
    registerWidget = {
        height: registerHeight - buttonHeight + "px",
        width: width + "px",
        maxWidth: "100%",
        padding: "5% 10%",
        color: textColor,
        borderTop: "0px solid #d3d5d9",
    };

    fontAwesomeIcon = {
        height: fontAwesomeIconHeight + "px",
        lineHeight: fontAwesomeIconHeight + "px",
        width: "15%",
        maxWidth: "15%",
        textAlign: "center",
        fontSize: "150%",
        display: "inline-block",
        float: "left",
        borderTopLeftRadius: "5px",
        borderBottomLeftRadius: "5px",
        borderRight: "0px solid white",
        marginTop: "20px",
    };

    @styleRule
    input = {
        width: "85%",
        maxWidth: "85%",
        height: fontAwesomeIconHeight + "px",
        lineHeight: fontAwesomeIconHeight + "px",
        display: "inline-block",
        float: "left",
        borderRadius: "0",
        borderTopRightRadius: "5px",
        borderBottomRightRadius: "5px",
        marginTop: "20px",
        fontWeight: "bold",
        color: textColor,
        border: "0px solid #d3d5d9",
        borderLeft: "0px solid white",
        boxShadow: "none",
        fontSize: "85%",
        ":focus": {
            boxShadow: "none",
            outline: "none",
            border: "0px solid #d3d5d9",
            borderLeft: "0px solid white",
        }
    };

    @styleRule
    countrySelect = {
        width: "85%",
        maxWidth: "85%",
        lineHeight: "30px",
        marginTop: "30px",
        marginBottom: "10px",
    };

    @styleRule
    badLogin = {
        height: "30px",
        width: "100%",
        fontSize: "14px",
        color: this.themeProperties.COLOR_DANGER,
        textAlign: "center",
    };

    @styleRule
    rememberMe = {
        display: "inline-block",
        float: "left",
        paddingLeft: "5px",
    };

    @styleRule
    rememberMeCheckbox = {
        float: "left"
    };

    @styleRule
    forgotPassword = {
        display: "inline-block",
        float: "right",
        paddingRight: "5px",
    };

    @styleRule
    signInButtonContainer = {
        width: "100%",
        height: "50px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "20px auto"
    };

    @styleRule
    signInButton = {
        marginLeft: "auto",
        marginRight: "auto",
        backgroundColor: "#f6f6f6",
        marginTop: "20px",
        minWidth: signInButtonWidth + "px",
        height: signInButtonHeight + "px",
        textAlign: "center",
        lineHeight: signInButtonHeight + "px",
        border: "0px solid #d3d5d9",
        fontSize: "18px",
        color: "#252525",
        ":hover": {
            border: "0px solid #0b79a7",
            borderBottom: "2px solid #0b79a7",
            color: "#0b79a7",
        }
    };

    @styleRule
    horizontalLine = {
        borderBottom: "1px solid #d3d5d9",
        width: "100%",
        marginTop: "20px",
    };

    connectWith = {
        width: "100%",
        textAlign: "center",
        marginTop: "20px",
    };

    connectIcons = {
        width: "60%",
        marginLeft: "20%",
        marginRight: "20%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginTop: "20px",
    };

    @styleRule
    faLogo = {
        height: "40px",
        paddingLeft: "15px",
        paddingRight: "15px",
        borderRadius: "3px",
        textAlign: "center",
        fontSize: "18px",
        marginLeft: "5px",
        marginRight: "5px",
        transition: ".2s",
        color: "#fff",
        ":hover": {
            transition: ".2s",
            opacity: ".9",
        },
        cursor: "pointer",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontWeight: "bold",
    };

    @styleRule
    recaptchaContainer = {
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        flexDirection: "column",
        width: "100%",
    };

    @styleRule
    connectWithButtonsSpan = {
        paddingLeft: "15px",
        fontSize: "15px",
    };

    @styleRule
    thirdPartyLoginContainer = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
        margin: "15px 0",
    };

    socialConnectDimensions = "35px";

    @styleRule
    socialConnectButtonContainer = {
        display: "flex",
        alignItems: "center",
        height: this.socialConnectDimensions,
        color: "#fff",
        paddingRight: "10px",
        borderRadius: "5px",
        margin: "5px",
        outline: "none",
        paddingTop: "0",
        cursor: "pointer",
        fontSize: "13px",
        border: "0",
        ":hover": {
            opacity: ".85",
        }
    };

    @styleRule
    socialConnectButtonIcon = {
        height: this.socialConnectDimensions,
        width: this.socialConnectDimensions,
        display: "flex !important",
        justifyContent: "center",
        alignItems: "center",
    };
}


export {LoginStyle}
