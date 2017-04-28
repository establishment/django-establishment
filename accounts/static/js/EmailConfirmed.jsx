import {UI, Link} from "UI";
import {GlobalStyle} from "GlobalStyle";

class EmailConfirmed extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            textAlign: "center"
        });
    }

    render() {
        let message;

        if (this.options.confirmSuccess) {
            message = <div>
                <h1>Email address confirmed, thank you!</h1>
                <h3>You can continue navigating on the website.</h3>
                <Link href="/accounts/settings/" className={GlobalStyle.Button.DEFAULT} value="Edit user profile" />
            </div>;
        } else {
            message = <div>
                <h1>Invalid email confirmation link.</h1>
                <h3>The email confirmation link is incomplete or has been used already.</h3>
            </div>;
        }

        return message;
    }
}

export {EmailConfirmed};
