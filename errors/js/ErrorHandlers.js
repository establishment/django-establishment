import {UI} from "../../../stemjs/src/ui/UIBase.js";
import {ErrorModal} from "../../../stemjs/src/ui/modal/Modal.jsx";
import {StoreObject} from "../../../stemjs/src/state/Store.js";

import {ErrorMessageStore, ErrorMessage} from "./state/ErrorMessageStore.js";

const ErrorHandlers = {};

ErrorHandlers.wrapError = (error) => {
    if (error instanceof StoreObject) {
        return error;
    }

    if (error.id) {
        return ErrorMessageStore.create(error);
    } else {
        if (typeof error === "string" || error instanceof String) {
            error = {message: error};
        } else if (error instanceof Error) {
            error = {
                name: error.name,
                message: error.message
            };
        }
        return new ErrorMessage(error);
    }
};

ErrorHandlers.showErrorAlert = (error) => {
    ErrorModal.show({
        error: ErrorHandlers.wrapError(error)
    });
};

ErrorHandlers.PAGE_NOT_FOUND = ErrorHandlers.wrapError("Page not found.");

export {ErrorHandlers};
