import {Ajax} from "../../../stemjs/base/Ajax.js";
import {Dispatcher} from "../../../stemjs/base/Dispatcher.js";

export function logout() {
    Dispatcher.Global.dispatch("logout");
    Ajax.postJSON("/accounts/logout/", {}).then(
            () => {
                Dispatcher.Global.dispatch("logoutSuccess");
                location.reload();
            }
        );
}
