import {UI} from "UI";
import {PublicUserStore} from "UserStore";

class UserHandle extends UI.Element {
    setOptions(options) {
        options.userId = options.userId || options.id;

        super.setOptions(options);

        this.options.color = this.options.color || "#2089b5";
        this.setUser(PublicUserStore.get(this.options.userId));
    }

    setUser(user) {
        this.user = user;
    }

    getNodeType() {
        return "span";
    }

    setColor(color) {
        this.options.color = color;
        this.handle.setStyle("color", color);
    }

    render() {
        let handle;
        if (!this.user) {
            PublicUserStore.fetch(this.options.userId, (user) => {
                this.setUser(user);
                this.redraw();
            });
            handle = <b ref="handle" style={{color: "#BBB"}}>{"user-" + this.options.userId}</b>;
        } else {
            handle = <span ref="handle" style={{cursor: "pointer", color: this.options.color}}
                      onClick={() => {window.open(this.user.getProfileUrl(), "_blank")}}><b>{this.user.getDisplayHandle()}</b></span>
        }

        //The purpose of the container is to simplify the usage of the popup.
        return [
            <span ref="container" style={{position: "relative", overflow: "hidden"}}>
                {handle}
                {this.options.children}
            </span>
        ]
    }
}

export {UserHandle};
