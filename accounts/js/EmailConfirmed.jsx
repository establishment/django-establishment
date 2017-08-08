import {UI} from "UI";

class EmailConfirmed extends UI.Element {
    extraNodeAttributes(attr) {
        attr.setStyle({
            textAlign: "center"
        });
    }

    render() {
        if (this.options.confirmSuccess) {
            location.replace("/accounts/settings/");
        }
        return [
            <div>
                <h1>Invalid email confirmation link.</h1>
                <h3>The email confirmation link is incomplete or has been used already.</h3>
            </div>
        ];
    }
}

export {EmailConfirmed};
