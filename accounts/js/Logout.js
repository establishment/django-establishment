import {Ajax} from "../../../stemjs/src/base/Ajax.js";
import {Dispatcher} from "../../../stemjs/src/base/Dispatcher.js";

export function logout() {
    Dispatcher.Global.dispatch("logout");
    Ajax.postJSON("/accounts/logout/", {}).then(
            () => {
                Dispatcher.Global.dispatch("logoutSuccess");
                location.reload();
            }
        );
}
