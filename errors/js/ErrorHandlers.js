import {UI} from "UI";
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
        return new ErrorMessage({message: error});
    }
};

ErrorHandlers.SHOW_ERROR_ALERT = (error) => {
    error = ErrorHandlers.wrapError(error);
    let errorModal = new UI.ErrorModal({error: error});
    errorModal.show();
};

export {ErrorHandlers};
