import {UI, Link} from "UI";
import {GlobalStyle} from "GlobalStyle";
import {StateDependentElement} from "StateDependentElement";

class EmailUnsubscribe extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            textAlign: "center",
        });
    }

    render() {
        let message;

        if (this.options.unsubscribeSuccess) {
            message = <div>
                <h1>Email unsubscribed!</h1>
                <h3>You can continue navigating on the website.</h3>
                <Link href="/accounts/settings/" className={GlobalStyle.Button.DEFAULT} value="Edit user profile" />
            </div>;
        } else {
            message = <div>
                <h1>Invalid email unsubscribe link.</h1>
                <h3>Please try to change the settings from your profile page.</h3>
            </div>;
        }

        return message;
    }
}

class DelayedEmailUnsubscribe extends StateDependentElement(EmailUnsubscribe) {
    getAjaxUrl() {
        return location.pathname;
    }

    importState(data) {
        super.importState(data);
        this.options.unsubscribeSuccess = data.unsubscribeSuccess;
    }
}

export {EmailUnsubscribe, DelayedEmailUnsubscribe};
