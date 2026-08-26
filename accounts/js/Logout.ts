import {Ajax} from "../../../stemjs/base/Ajax";
import {Dispatcher} from "../../../stemjs/base/Dispatcher";

export function logout() {
    Dispatcher.Global.dispatch("logout");
    Ajax.postJSON("/accounts/logout/", {}).then(
            () => {
                Dispatcher.Global.dispatch("logoutSuccess");
                location.reload();
            }
        );
}
