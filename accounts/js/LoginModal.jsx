import {UI, Modal} from "UI";
import {Login} from "Login";
import {Device} from "Device";

class LoginModal extends Modal {
    getModalWindowStyle() {
        if (Device.isTouchDevice()) {
            return {
                position: "relative",
                padding: "0",
                boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
                // margin: "60px auto",
                display: this.options.display || "block",
                left: "0",
                right: "0",
                width: "100vw",
                height: "600px",
                background: "white",
                overflow: this.options.overflow || "auto",
                maxHeight: "100%",
                maxWidth: "500px",
                verticalAlign: "center",
                margin: "0 auto",
            }
        }
        return {
            position: "relative",
            padding: "0",
            boxShadow: "0 5px 15px rgba(0,0,0,0.5)",
            margin: "60px auto",
            display: this.options.display || "block",
            maxHeight: this.options.maxHeight || "85%",
            left: "0",
            right: "0",
            width: "500px",
            height: this.options.height || "600px",
            background: "white",
            overflow: this.options.overflow || "auto",
        };
    }

    render() {
        return <Login/>;
    }

    static requireLogin(func) {
        if (USER.isAuthenticated) {
            return func();
        } else {
            this.show();
        }
    }
}

export {LoginModal};
