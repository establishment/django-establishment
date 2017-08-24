import {UI, Link} from "ui/UI";
import {ButtonStyle} from "ui/button/ButtonStyle";

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
                <Link href="/accounts/settings/" className={ButtonStyle.getInstance().DEFAULT} value="Edit user profile" />
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
