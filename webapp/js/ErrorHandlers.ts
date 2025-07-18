import {UI} from "../../../stemjs/src/ui/UIBase";
import {ErrorModal} from "../../../stemjs/src/ui/modal/Modal";
import {StoreObject} from "../../../stemjs/src/state/Store";

import {ErrorMessageStore, ErrorMessage} from "./state/ErrorMessageStore";

type ErrorInput = string | Error | StoreObject | ErrorMessage | {
    id?: string | number;
    name?: string;
    message?: string;
    [key: string]: any;
};

interface ErrorHandlersInterface {
    wrapError(error: ErrorInput): StoreObject | ErrorMessage;
    showErrorAlert(error: ErrorInput): void;
    PAGE_NOT_FOUND: StoreObject | ErrorMessage;
}

export const ErrorHandlers: ErrorHandlersInterface = {
    wrapError: (error: ErrorInput): StoreObject | ErrorMessage => {
        if (error instanceof StoreObject) {
            return error;
        }

        if (typeof error === "object" && error !== null && "id" in error && error.id) {
            return ErrorMessageStore.create(error);
        } else {
            let errorObj: { name?: string; message?: string; [key: string]: any };
            
            if (typeof error === "string" || error instanceof String) {
                errorObj = { message: error.toString() };
            } else if (error instanceof Error) {
                errorObj = {
                    name: error.name,
                    message: error.message
                };
            } else {
                errorObj = error as any;
            }
            return new ErrorMessage(errorObj);
        }
    },

    showErrorAlert: (error: ErrorInput): void => {
        ErrorModal.show({
            error: ErrorHandlers.wrapError(error)
        });
    },

    PAGE_NOT_FOUND: null as any // Will be initialized below
};

ErrorHandlers.PAGE_NOT_FOUND = ErrorHandlers.wrapError("Page not found.");
