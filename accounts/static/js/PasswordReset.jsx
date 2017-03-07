import {UI} from "UI";
import {Ajax} from "Ajax";

class PasswordReset extends UI.Element {
    render() {
        if (USER.isAuthenticated) {
            window.location.href = "/accounts/settings/";
        }

        return [
            <div className="text-center">
                <h1>Password reset</h1>
                <p>Forgotten your password? Enter your e-mail address below, and we'll send you an e-mail allowing you to reset it.</p>
            </div>,

            <UI.FormField ref="emailFormField" label="Email">
                <UI.TextInput ref="emailInput" />
            </UI.FormField>,
            <UI.FormField label=" ">
                <div>
                    <UI.AjaxButton ref="resetPasswordButton" level={UI.Level.PRIMARY} onClick={() => this.sendPasswordReset()}
                                   statusOptions={["Send password reset email", {faIcon: "spinner fa-spin", label:" Sending..."}, "Email sent", "Email failed"]}/>
                </div>
            </UI.FormField>
        ]
    }

    sendPasswordReset() {
        var data = {
            email: this.emailInput.getValue().trim(),
        };
        this.emailFormField.removeError();

        this.resetPasswordButton.ajaxCall({
            url: window.location.href,
            type: "POST",
            dataType: "json",
            data: data,
            success: (data) => {
                if (data.error) {
                    this.emailFormField.setError(data.error);
                }
            },
            error: (error) => {
                console.log("Error:\n" + error.message);
                console.log(error.stack);
            }
        });

    }

}

export {PasswordReset};
