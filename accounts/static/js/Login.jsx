import {UI} from "UI";

import {ensure} from "Require";
import {Ajax} from "Ajax";
import {GoogleManager} from "GoogleManager";
import {GithubManager} from "GithubManager";
import {FacebookManager} from "FacebookManager";

import {css, hover, focus, active, ExclusiveClassSet, StyleSet} from "Style";
import {FAIcon} from "FontAwesome";
import {BasicTabTitle} from "tabs/TabArea";
import {Device} from "Device";
import {LoginStyle} from "LoginStyle";


let loginStyle = LoginStyle.getInstance();


class ThirdPartyLogin extends UI.Element {

    setOptions(options) {
        super.setOptions(options);
        FacebookManager.Global();
        GoogleManager.Global();
    }

    getConnectWith() {
        return <UI.Element style={loginStyle.connectWith}>
            or connect with
        </UI.Element>;
    }

    getConnectWithButtons() {
        return <UI.Element style={loginStyle.connectIcons}>

            <FAIcon icon="facebook"
                    className={loginStyle.faLogo}
                    style={{
                        "background-color": "#3b5998",
                        "cursor": "pointer"
                    }}
                    ref="facebookButton">
                <span style={{
                    "font-family": "montserrat",
                    "padding-left": "15px",
                    "font-size": "15px",
                }}>
                    facebook
                </span>
            </FAIcon>

            <FAIcon icon="google-plus"
                    className={loginStyle.faLogo}
                    style={{
                        "background-color": "#DE4B39",
                        "cursor": "pointer"
                    }}
                    ref="googleButton">
                <span style={{
                    "font-family": "montserrat",
                    "padding-left": "15px",
                    "font-size": "15px",
                }}>
                    google
                </span>
            </FAIcon>

            <FAIcon icon="github"
                    className={loginStyle.faLogo}
                    style={{
                        "background-color": "#000",
                        "cursor": "pointer"
                    }}
                    ref="githubButton">
                <span style={{
                    "font-family": "montserrat",
                    "padding-left": "15px",
                    "font-size": "15px",
                }}>
                    github
                </span>
            </FAIcon>
        </UI.Element>;
    }

    render() {
        return [this.getConnectWith(),
            this.getConnectWithButtons(),
        ];
    }

    onMount() {
        this.googleButton.addClickListener(() => {
            GoogleManager.Global().handleAuthClick(window.location.pathname, "login", () => {
                window.location.reload();
            });
        });
        this.facebookButton.addClickListener(() => {
            FacebookManager.Global().login(window.location.pathname, 'authenticate', 'login');
        });

        this.githubButton.addClickListener(() => {
            GithubManager.Global().login(() => {
                window.location.reload();
            });
        });
    }
}


class ErrorMessage extends UI.Element {
    setError(error) {
        this.error = error;
        this.redraw();
    }

    render() {
        return this.error;
    }
}


class LoginWidget extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(loginStyle.loginWidget);

        return attr;
    }

    getEmailInput() {
        return [
            <div style={{width: "100%",}}>
                <FAIcon
                    icon="user"
                    style={loginStyle.fontAwesomeIcon}
                />
                <UI.EmailInput
                    autofocus="autofocus"
                    placeholder="Email address"
                    name="email"
                    ref="emailInput"
                    className={loginStyle.input}
                />
            </div>
        ];
    }

    getPasswordInput() {
        return [
            <div style={{width: "80% !important",}}>
                <FAIcon icon="lock"
                        style={loginStyle.fontAwesomeIcon}
                />
                <UI.PasswordInput
                    placeholder="Password"
                    name="password"
                    ref="passwordInput"
                    className={loginStyle.input}
                    style={{
                        "margin-bottom": "20px",
                    }}
                />
            </div>
        ];
    }

    getRememberMeCheckbox() {
        return [
            <UI.CheckboxInput checked={true}
                              ref="rememberInput"
                              style={{
                                  "float": "left",
                              }}
            />,
            <div className={loginStyle.rememberMe}>Remember me</div>,
        ];
    }

    getForgotPassword() {
        return <a className={loginStyle.forgotPassword} href="/accounts/password_reset">Forgot Password?</a>;
    }

    getBadLogin() {
        return <ErrorMessage className={loginStyle.badLogin} ref="loginErrorMessage"/>;
    }

    getSignInButton() {
        return <div style={{width: "100%", height: "50px", display: "flex", alignItems: "center", justifyContent: "center",}}>
            <UI.SubmitInput className={loginStyle.signInButton} value="Sign In"/>
        </div>;
    }

    getHorizontalLine() {
        return <div className={loginStyle.horizontalLine}>
        </div>;
    }

    render() {
        return [
            <form ref="form">
                {this.getEmailInput()}
                {this.getPasswordInput()}
                {this.getRememberMeCheckbox()}
                {this.getForgotPassword()}
                {this.getBadLogin()}
                {this.getSignInButton()}
            </form>,
            this.getHorizontalLine(),
            <ThirdPartyLogin/>,
        ];
    }

    sendLogin() {
        var data = {
            email: this.emailInput.getValue(),
            password: this.passwordInput.getValue(),
            remember: this.rememberInput.getValue()
        };
        // console.log(data);
        Ajax.request({
            url: "/accounts/login/",
            type: "POST",
            dataType: "json",
            data: data,
            success: (data) => {
                if (data["error"] != null) {
                    this.loginErrorMessage.setError("Wrong username or password");
                    this.mainFormGroup.setError(data.error);
                } else {
                    location.reload();
                }
            },
            error: (xhr, errmsg, err) => {
                console.log("Error logging in:\n" + xhr.status + ":\n" + xhr.responseText);
            }
        });
    }

    onMount() {
        if (this.form) {
            this.form.addNodeListener("submit", (event) => {
                this.sendLogin();
                event.preventDefault();
            });
        }
    }
}

class RecaptchaWidget extends UI.Element {
    redrawRecaptcha() {
        const googleKey = "6LclHBUUAAAAANvX5bcOZydyugqFj9p5B96EQ6NG";
        grecaptcha.render(this.node, {
            "sitekey": googleKey
        });
    }

    onMount() {
        window.onRecaptchaCallback = () => this.redrawRecaptcha();

        ensure("https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaCallback", () => {
        });
    }
}

class RegisterWidget extends UI.Element {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(loginStyle.registerWidget);

        return attr;
    }

    getSignUpButton() {
        return <div style={{width: "100%", height: "50px", display: "flex", alignItems: "center", justifyContent: "center",}}>
            <UI.SubmitInput className={loginStyle.signInButton} value="Sign Up"/>
        </div>;
    }

    render() {
        return [
            <div ref="container">
                <form ref="form">
                    {this.getEmailInput()}
                    <div style={{
                        height: "190px",
                        width: "100%",
                    }}></div>
                <RecaptchaWidget style={{display: "flex", alignItems: "center", justifyContent: "center",}} ref="recaptchaWidget" />
                    {this.getSignUpButton()}
                </form>
            </div>
        ];
    }

    sendRegistration() {
        Ajax.post("/accounts/signup_request/", {
            dataType: "json",
            data: {
                email: this.emailInput.getValue(),
                recaptchaKey: grecaptcha.getResponse()
            },

            success: (data) => {
                if (data["result"] !== "success") {
                    this.container.appendChild(<div> {"Error in registration:\n" + data.error} </div>);
                    this.recaptchaWidget.redrawRecaptcha();
                } else {
                    this.recaptchaWidget.hide();
                    this.container.appendChild(<div> {"Done! Please check your email to continue"} </div>);
                }
            },

            error: (xhr, errmsg, err) => {
                throw new Error("Sign up error:", errmsg);
            }
        });
    }

    onMount() {
        this.form.addNodeListener("submit", (event) => {
            this.sendRegistration();
            event.preventDefault();
        })
    }
}

RegisterWidget.prototype.getEmailInput = LoginWidget.prototype.getEmailInput;
RegisterWidget.prototype.getHorizontalLine = LoginWidget.prototype.getHorizontalLine;


// original name: LoginRegisterSystem
class NormalLogin extends UI.Element {
    constructor() {
        super();

        this.state = 0;
    }

    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(loginStyle.loginRegisterSystem);

        return attr;
    }

    getLoginButton() {
        let style = {};

        if (this.state === 0) {
            style = loginStyle.selectedLeft;
        }

        return <div className={loginStyle.loginSystemButton}
                    style={style}
                    ref="loginButton">
            Log In
        </div>
    }

    getRegisterButton() {
        let style = {};

        if (this.state === 1) {
            style = loginStyle.selectedRight;
        }

        return <div className={loginStyle.registerSystemButton}
                    style={style}
                    ref="registerButton">
            Sign Up
        </div>
    }

    render() {
        let result = [
            <div className={loginStyle.loginRegisterButtons}>
                {this.getLoginButton()}
                {this.getRegisterButton()}
            </div>,
            <UI.Switcher ref="switcher">
                <LoginWidget ref="loginWidget" active={this.state === 0} />
                <RegisterWidget ref="registerWidget" active={this.state === 1} />
            </UI.Switcher>
        ];

        return result;
    }

    onMount() {
        this.loginButton.addClickListener(() => {
            this.state = 0;
            this.switcher.setActive(this.loginWidget);
            this.redraw();
        });

        this.registerButton.addClickListener(() => {
            this.state = 1;
            this.switcher.setActive(this.registerWidget);
            this.redraw();
        });
    }
}


class LoginTabButton extends UI.Primitive(BasicTabTitle, "div") {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(loginStyle.loginSystemButton);
        if (this.options.active) {
            attr.addClass(loginStyle.selectedLeftClass);
        }

        return attr;
    }

    render() {
        return "Log In";
    }
}

class RegisterTabButton extends UI.Primitive(BasicTabTitle, "div") {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        attr.addClass(loginStyle.registerSystemButton);
        if (this.options.active) {
            attr.addClass(loginStyle.selectedRightClass);
        }

        return attr;
    }

    render() {
        return "Register";
    }
}


class Login extends UI.Panel {
    getNodeAttributes() {
        let attr = super.getNodeAttributes();

        // attr.setStyle("margin-left", "20%");
        // attr.setStyle("margin-right", "20%");

        return attr;
    }

    render() {
        return [
            <NormalLogin/>,
        ];
    }
}

export {Login};
