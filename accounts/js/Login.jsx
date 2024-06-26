import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {registerStyle, Theme} from "../../../stemjs/src/ui/style/Theme.js";
import {ensure} from "../../../stemjs/src/base/Require.js";
import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {Switcher} from "../../../stemjs/src/ui/Switcher.jsx";
import {Link} from "../../../stemjs/src/ui/primitives/Link.jsx";
import {EmailInput, PasswordInput, Select, SubmitInput, TextInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {BasicTabTitle} from "../../../stemjs/src/ui/tabs/TabArea.jsx";
import {TemporaryMessageArea} from "../../../stemjs/src/ui/misc/TemporaryMessageArea.jsx";
import {FAIcon} from "../../../stemjs/src/ui/FontAwesome.jsx";

import {CountryStore} from "../../localization/js/state/CountryStore.js";
import {SocialAppStore} from "../../socialaccount/js/state/SocialAppStore.js";
import {LoginStyle} from "./LoginStyle";
import {ThirdPartyLogin} from "./thirt-party/ThirdPartyLogin.jsx";

const ERROR_TIMEOUT = 6 * 1000;

const accountsConfig = {
    username: true,
    country: true,
};


@registerStyle(LoginStyle)
export class LoginWidget extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.loginWidget);
    }

    getEmailInput(emailIcon="user") {
        return [
            <div style={{width: "100%",}}>
                <FAIcon
                    icon={emailIcon}
                    style={this.styleSheet.fontAwesomeIcon}
                />
                <EmailInput
                    autofocus="autofocus"
                    placeholder="Email address"
                    name="email"
                    ref="emailInput"
                    className={this.styleSheet.input}
                />
            </div>
        ];
    }

    getPasswordInput(passwordInputOptions={}) {
        passwordInputOptions = Object.assign({
            name: "password",
            className: this.styleSheet.input,
            ref: "passwordInput",
            placeholder: "Password",
            style: {marginBottom: "20px"}
        }, passwordInputOptions);
        return [
            <div style={{width: "80% !important",}}>
                <FAIcon icon="lock" style={this.styleSheet.fontAwesomeIcon} />
                <PasswordInput {...passwordInputOptions} />
            </div>
        ];
    }

    getForgotPassword() {
        return <Link className={this.styleSheet.forgotPassword} href="/accounts/password_reset"
                     value={UI.T("Forgot Password?")} />;
    }

    getClearBothArea() {
        return <div style={{clear: "both", height: "20px"}} />;
    }

    getErrorArea() {
        return <TemporaryMessageArea className={this.styleSheet.badLogin} ref="loginErrorMessage"/>;
    }

    getSignInValue() {
        return "Sign In";
    }

    getSignInButton() {
        return <div className={this.styleSheet.signInButtonContainer}>
            <SubmitInput className={this.styleSheet.signInButton} value={this.getSignInValue()} />
        </div>;
    }

    getHorizontalLine() {
        return <div className={this.styleSheet.horizontalLine} />;
    }

    getThirdPartyLogin() {
        const socialApps = SocialAppStore.all();

        return (socialApps.length > 0) && [
            this.getHorizontalLine(),
            <ThirdPartyLogin socialApps={socialApps} loginElement={this} />,
        ];
    }

    render() {

        return [
            <form ref="form">
                {this.getEmailInput()}
                {this.getPasswordInput()}
                {this.getForgotPassword()}
                {this.getSignInButton()}
                {this.getClearBothArea()}
                {this.getErrorArea()}
            </form>,
            this.getThirdPartyLogin(),
        ];
    }

    setErrorMessage(error, isError=true) {
        this.loginErrorMessage.showMessage(error.message, isError? Theme.props.COLOR_DANGER : "#000", ERROR_TIMEOUT);
    }

    clearErrorMessage() {
        this.loginErrorMessage.clear();
    }

    sendLogin() {
        this.clearErrorMessage();
        const data = {
            email: this.emailInput.getValue(),
            password: this.passwordInput.getValue(),
            remember: true
        };
        Ajax.postJSON("/accounts/login/", data).then(
            () => location.reload(),
            (error) => this.setErrorMessage(error)
        );
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
    render() {
        return <div key={Math.random()} />;
    }

    redraw() {
        super.redraw();

        if (window.grecaptcha && window.GOOGLE_RECAPTCHA_PUBLIC_KEY) {
            this.captchaId = grecaptcha.render(this.children[0].node, {
                "sitekey": window.GOOGLE_RECAPTCHA_PUBLIC_KEY,
            });
        }
    }

    getResponse() {
        return grecaptcha.getResponse(this.captchaId);
    }

    onMount() {
        window.onRecaptchaCallback = () => this.redraw();

        ensure("https://www.google.com/recaptcha/api.js?render=explicit&onload=onRecaptchaCallback", () => {});
    }
}


@registerStyle(LoginStyle)
export class RegisterWidget extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.registerWidget);
    }

    getSignUpButton() {
        return  <div className={this.styleSheet.signInButtonContainer}>
                    <SubmitInput className={this.styleSheet.signInButton} value="Sign Up" ref="submitButton"/>
                </div>;
    }

    getUsernameInput() {
        return [
            <div style={{width: "100%",}}>
                <FAIcon icon="user"
                        style={this.styleSheet.fontAwesomeIcon}/>
                <TextInput
                    placeholder="Username"
                    ref="usernameInput"
                    className={this.styleSheet.input}
                />
            </div>
        ];
    }

    getCountryInput() {
        return [
            <div style={{width: "100%", marginBottom: "20px"}}>
                <FAIcon icon="flag" style={this.styleSheet.fontAwesomeIcon} />
                <Select ref="countrySelect" options={CountryStore.allWithNone("Don't set country")}
                        className={this.styleSheet.countrySelect} />
                <div style={{clear: "both"}}/>
            </div>
        ];
    }

    render() {
        let formFields = [
            this.getEmailInput(),
            this.getPasswordInput()
        ];
        if (accountsConfig.username) {
            formFields.splice(1, 0, this.getUsernameInput());
            formFields[0] = this.getEmailInput("envelope");
        }
        if (accountsConfig.country) {
            formFields[formFields.length - 1] = this.getPasswordInput({style: {}});
            formFields.push(this.getCountryInput());
        }
        // TODO: This should be done in another way.
        if (window.location.hostname !== "localhost") {
            this.recaptchaWidget = <RecaptchaWidget />
        }
        return [
            <form ref="form">
                {formFields}
                <div className={this.styleSheet.recaptchaContainer}>
                    {this.recaptchaWidget}
                    {this.getSignUpButton()}
                    <TemporaryMessageArea ref="errorArea" />
                </div>
            </form>
        ];
    }

    sendRegistration() {
        this.submitButton.updateOptions({value: "Signing up..."});

        const data = {
            email: this.emailInput.getValue(),
            recaptchaKey: this.recaptchaWidget && this.recaptchaWidget.getResponse(),
            password: this.passwordInput.getValue(),
        };
        if (this.usernameInput) {
            data.username = this.usernameInput.getValue();
        }
        if (this.countrySelect) {
           data.countryId = this.countrySelect.get().id;
        }
        Ajax.postJSON("/accounts/signup_request/", data).then(
            () => {
                this.recaptchaWidget && this.recaptchaWidget.hide();
                this.submitButton.hide();
                this.errorArea.showMessage("Done! Please check your email to continue", "black", 26 * 60 * 60 * 1000);
            },
            (error) => {
                this.errorArea.showMessage("Error in registration: " + error.message, "red", 4000);
                this.submitButton.updateOptions({value: "Sign Up"});
                this.recaptchaWidget && this.recaptchaWidget.redraw();
            }
        );
    }

    onMount() {
        this.form.addNodeListener("submit", (event) => {
            event.preventDefault();
            this.sendRegistration();
        })
    }
}

RegisterWidget.prototype.getEmailInput = LoginWidget.prototype.getEmailInput;
RegisterWidget.prototype.getPasswordInput = LoginWidget.prototype.getPasswordInput;
RegisterWidget.prototype.getHorizontalLine = LoginWidget.prototype.getHorizontalLine;


// original name: LoginRegisterSystem
@registerStyle(LoginStyle)
class NormalLogin extends UI.Element {
    constructor() {
        super();

        this.state = 0;
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.loginRegisterSystem);
    }

    getLoginButton() {
        let style = {};

        if (this.state === 0) {
            style = this.styleSheet.selectedLeft;
        }

        return <div className={this.styleSheet.loginSystemButton}
                    style={style}
                    ref="loginButton">
            {UI.T("Log In")}
        </div>
    }

    getRegisterButton() {
        let style = {};

        if (this.state === 1) {
            style = this.styleSheet.selectedRight;
        }

        return <div className={this.styleSheet.registerSystemButton}
                    style={style}
                    ref="registerButton">
            {UI.T("Sign Up")}
        </div>
    }

    render() {
        return [
            <div className={this.styleSheet.loginRegisterButtons}>
                {this.getLoginButton()}
                {this.getRegisterButton()}
            </div>,
            <Switcher ref="switcher">
                <LoginWidget ref="loginWidget" active={this.state === 0} />
                <RegisterWidget ref="registerWidget" active={this.state === 1} />
            </Switcher>
        ];
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


@registerStyle(LoginStyle)
class LoginTabButton extends UI.Primitive(BasicTabTitle, "div") {
    getDefaultOptions() {
        return {
            children: [UI.T("Log In")]
        };
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.loginSystemButton);
        if (this.options.active) {
            attr.addClass(this.styleSheet.selectedLeftClass);
        }
    }
}

@registerStyle(LoginStyle)
class RegisterTabButton extends UI.Primitive(BasicTabTitle, "div") {
    getDefaultOptions() {
        return {
            children: [UI.T("Register")]
        };
    }

    extraNodeAttributes(attr) {
        attr.addClass(this.styleSheet.registerSystemButton);
        if (this.options.active) {
            attr.addClass(this.styleSheet.selectedRightClass);
        }
    }
}


class Login extends UI.Element {
    render() {
        return [
            <NormalLogin/>,
        ];
    }
}

export {Login};
