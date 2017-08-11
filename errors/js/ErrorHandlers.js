import {UI, ErrorModal} from "UI";
import {StoreObject} from "Store";
import {ErrorMessageStore, ErrorMessage} from "ErrorMessageStore";

var ErrorHandlers = {};

ErrorHandlers.wrapError = (error) => {
    if (error instanceof StoreObject) {
        return error;
    }

    if (error.id) {
        return ErrorMessageStore.fakeCreate(error);
    } else {
        if (typeof error === "string" || error instanceof String) {
            error = {message: error};
        }
        return new ErrorMessage(error);
    }
};

ErrorHandlers.SHOW_ERROR_ALERT = (error) => {
    error = ErrorHandlers.wrapError(error);
    ErrorModal.show({error: error});
};

export {ErrorHandlers};
