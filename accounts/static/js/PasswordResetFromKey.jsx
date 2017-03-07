import {UI} from "UI";
import {Ajax} from "Ajax";

class PasswordResetFromKey extends UI.Element {
    render() {
        if (this.options.tokenFail) {
            return [
                <div className="col-sm-8 col-sm-offset-2 text-center">
                    <h1>Invalid password reset link</h1>

                    <p>The password reset link is invalid, either because it has already been used or has been copied incorrectly from the email.
                        Please request a <a href="/accounts/password_reset/">new password reset</a>.</p>
                </div>
            ];
        }

        return [
            <div className="text-center">
                <h1>Set password</h1>
            </div>,

            <UI.FormField ref="passwordFormField" label="New password">
                <UI.PasswordInput ref="passwordInput" />
            </UI.FormField>,
            <UI.FormField label=" ">
                <div>
                    <UI.AjaxButton ref="setPasswordButton" level={UI.Level.PRIMARY} onClick={() => this.setNewPassword()}
                                   statusOptions={["Set password", {faIcon: "spinner fa-spin", label:" Setting..."}, "Password set", "Password failed"]}/>
                </div>
            </UI.FormField>
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
