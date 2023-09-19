import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {Link} from "../../../stemjs/src/ui/primitives/Link.jsx";
import {ButtonStyle} from "../../../stemjs/src/ui/button/ButtonStyle.js";

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
                <Link href="/accounts/settings/" className={ButtonStyle.getInstance().container} value="Edit user profile" />
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
