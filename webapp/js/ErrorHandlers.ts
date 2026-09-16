import {UI} from "../../../stemjs/ui/UIBase";
import {ErrorModal} from "../../../stemjs/ui/modal/Modal";
import {StoreObject} from "../../../stemjs/state/Store";

import {ErrorMessage} from "./state/ErrorMessageStore";

export type ErrorInput = string | Error | ErrorMessage | {
    id?: string | number;
    name?: string;
    message?: string;
    [key: string]: unknown;
};

interface ErrorHandlersInterface {
    wrapError(error: ErrorInput): ErrorMessage;
    showErrorAlert(error: ErrorInput): void;
    PAGE_NOT_FOUND: ErrorMessage;
}

// Outside the object so PAGE_NOT_FOUND can be wrapped where it is declared
function wrapError(error: ErrorInput): ErrorMessage {
    if (error instanceof StoreObject) {
        return error;
    }

    if (typeof error === "object" && error !== null && "id" in error && error.id) {
        return ErrorMessage.create(error);
    } else {
        let errorObj: {name?: string; message?: string; [key: string]: unknown};

        if (typeof error === "string" || error instanceof String) {
            errorObj = { message: error.toString() };
        } else if (error instanceof Error) {
            errorObj = {
                name: error.name,
                message: error.message
            };
        } else {
            errorObj = error;
        }
        return new ErrorMessage(errorObj);
    }
}

export const ErrorHandlers: ErrorHandlersInterface = {
    wrapError,

    showErrorAlert: (error: ErrorInput): void => {
        ErrorModal.show({
            error: ErrorHandlers.wrapError(error)
        });
    },

    PAGE_NOT_FOUND: wrapError("Page not found."),
};
