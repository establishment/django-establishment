import {type TemporaryMessageArea} from "../../../stemjs/ui/misc/TemporaryMessageArea";
import {type ErrorMessage} from "../../webapp/js/state/ErrorMessageStore";

// Names the fields a request was refused over, since the forms show no error beside each input
export function showRequestError(messageArea: TemporaryMessageArea, error: ErrorMessage) {
    const fieldNames = (error.fields ?? []).map(({field}) => field);
    const suffix = fieldNames.length ? " (" + fieldNames.join(", ") + ")" : "";
    messageArea.showMessage(error.message + suffix, "red");
}
