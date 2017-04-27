import {UI} from "UI";
import {GlobalStyle} from "GlobalStyle";

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
                <a href="/accounts/settings" className={GlobalStyle.Button.DEFAULT}>Edit user profile</a>
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

export {EmailUnsubscribe};
