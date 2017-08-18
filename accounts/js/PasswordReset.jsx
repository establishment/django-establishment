import {UI, FormField, AjaxButton, TextInput} from "UI";
import {Ajax} from "Ajax";
import {Level} from "ui/Constants";

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

            <FormField ref="emailFormField" label="Email">
                <TextInput ref="emailInput" />
            </FormField>,
            <FormField label=" ">
                <div>
                    <AjaxButton ref="resetPasswordButton" level={Level.PRIMARY} onClick={() => this.sendPasswordReset()}
                                   statusOptions={["Send password reset email", {faIcon: "spinner fa-spin", label:" Sending..."}, "Email sent", "Email failed"]}/>
                </div>
            </FormField>
        ]
    }

    sendPasswordReset() {
        this.emailFormField.removeError();

        let url = window.location.href;
        if (!url.endsWith("/")) {
            url += "/";
        }

        this.resetPasswordButton.postJSON(url, {
            email: this.emailInput.getValue().trim(),
        }).then(
            () => {},
            (error) => this.emailFormField.setError(error.message)
        );
    }

}

export {PasswordReset};
