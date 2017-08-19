import {Ajax} from "base/Ajax";
import {Dispatcher} from "base/Dispatcher";

export function logout() {
    Dispatcher.Global.dispatch("logout");
    Ajax.postJSON("/accounts/logout/", {}).then(
            () => {
                Dispatcher.Global.dispatch("logoutSuccess");
                location.reload();
            }
        );
}
