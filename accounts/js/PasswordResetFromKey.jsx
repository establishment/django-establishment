import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Link} from "../../../stemjs/src/ui/primitives/Link.jsx";
import {FormField} from "../../../stemjs/src/ui/form/Form.jsx";
import {PasswordInput} from "../../../stemjs/src/ui/input/Input.jsx";
import {AjaxButton} from "../../../stemjs/src/ui/button/AjaxButton.jsx";
import {Level} from "../../../stemjs/src/ui/Constants.js";

class PasswordResetFromKey extends UI.Element {
    render() {
        if (this.options.tokenFail) {
            return [
                <div className="col-sm-8 col-sm-offset-2 text-center">
                    <h1>Invalid password reset link</h1>

                    <p>The password reset link is invalid, either because it has already been used or has been copied incorrectly from the email.
                        Please request a <Link href="/accounts/password_reset/" value="new password reset" />.</p>
                </div>
            ];
        }

        return [
            <div className="text-center">
                <h1>Set password</h1>
            </div>,

            <FormField ref="passwordFormField" label="New password">
                <PasswordInput ref="passwordInput" />
            </FormField>,
            <FormField label=" ">
                <div>
                    <AjaxButton ref="setPasswordButton" level={Level.PRIMARY} onClick={() => this.setNewPassword()}
                                   statusOptions={["Set password", {icon: "spinner fa-spin", label:" Setting..."}, "Password set", "Password failed"]}/>
                </div>
            </FormField>
        ]
    }

    setNewPassword() {
        this.passwordFormField.removeError();

        this.setPasswordButton.postJSON("/accounts/password_change/", {
            newPassword: this.passwordInput.getValue(),
        }).then(
            () => location.replace("/"),
            (error) => this.passwordFormField.setError(error.message)
        );
    }

}

export {PasswordResetFromKey};
