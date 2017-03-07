import {UI} from "UI";

class EmailUnsubscribe extends UI.Element {
    extraNodeAttributes(attr) {
        attr.addClass("col-sm-8");
        attr.addClass("col-sm-offset-2");
    }

    render() {
        let message;

        if (this.options.unsubscribeSuccess) {
            message = <div>
                <h1>Email unsubscribed!</h1>
                <h3>You can continue navigating on the website.</h3>
                <a href="/accounts/settings" className="btn btn-info">Edit user profile</a>
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
