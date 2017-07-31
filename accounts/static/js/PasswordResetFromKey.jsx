import {UI, Link, FormField, PasswordInput, AjaxButton} from "UI";
import {Ajax} from "Ajax";
import {Level} from "Constants";

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
                                   statusOptions={["Set password", {faIcon: "spinner fa-spin", label:" Setting..."}, "Password set", "Password failed"]}/>
                </div>
            </FormField>
        ]
    }

    setNewPassword() {
        var data = {
            newPassword: this.passwordInput.getValue(),
        };
        this.passwordFormField.removeError();

        this.setPasswordButton.ajaxCall({
            url: "/accounts/password_change/",
            type: "POST",
            dataType: "json",
            data: data,
            success: (data) => {
                if (data.error) {
                    this.passwordFormField.setError(data.error);
                }
            },
            error: (error) => {
                console.log("Error:\n" + error.message);
                console.log(error.stack);
            }
        });

    }

}

export {PasswordResetFromKey};
