import {UI} from "UI";

class EmailConfirmed extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass("col-sm-8");
        attr.addClass("col-sm-offset-2");
    }

    render() {
        let message;

        if (this.options.confirmSuccess) {
            message = <div>
                <h1>Email address confirmed, thank you!</h1>
                <h3>You can continue navigating on the website.</h3>
                <a href="/accounts/settings" className="btn btn-info">Edit user profile</a>
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
