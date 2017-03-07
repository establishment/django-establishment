define(["exports", "UI", "GlobalState", "ErrorMessageStore"], function (exports, _UI, _GlobalState, _ErrorMessageStore) {
    "use strict";

    Object.defineProperty(exports, "__esModule", {
        value: true
    });
    exports.ErrorHandlers = undefined;


    var ErrorHandlers = {};

    ErrorHandlers.wrapError = function (error) {
        if (error instanceof _GlobalState.StoreObject) {
            return error;
        }

        if (error.id) {
            return _ErrorMessageStore.ErrorMessageStore.fakeCreate(error);
        } else {
            return new _ErrorMessageStore.ErrorMessage(error);
        }
    };

    ErrorHandlers.SHOW_ERROR_ALERT = function (error) {
        error = ErrorHandlers.wrapError(error);
        var errorModal = new _UI.UI.ErrorModal({ error: error });
        errorModal.show();
    };

    exports.ErrorHandlers = ErrorHandlers;
});
