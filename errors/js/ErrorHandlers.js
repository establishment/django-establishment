import {StoreObject} from "state/Store";
import {UI, ErrorModal} from "ui/UI";

import {ErrorMessageStore, ErrorMessage} from "state/ErrorMessageStore";

const ErrorHandlers = {};

ErrorHandlers.wrapError = (error) => {
    if (error instanceof StoreObject) {
        return error;
    }

    if (error.id) {
        return ErrorMessageStore.fakeCreate(error);
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
