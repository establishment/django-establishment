import {Ajax} from "base/Ajax";
import {StemApp} from "app/StemApp";
import {getCookie} from "base/Utils";
import {ErrorHandlers} from "ErrorHandlers";
import {GlobalState} from "state/State";
import {WebsocketSubscriber} from "websocket/WebsocketSubscriber";

export class EstablishmentApp extends StemApp {
    static init() {
        this.addAjaxProcessors();
        this.registerWebsocketStreams();
        return super.init();
    }

    static registerWebsocketStreams() {
        GlobalState.registerStream = function (streamName) {
            WebsocketSubscriber.addListener(streamName, GlobalState.applyEventWrapper);
        };

        //Register on the global event stream
        GlobalState.registerStream("global-events");

        //Register on the user event stream
        if (self.USER && self.USER.id) {
            GlobalState.registerStream("user-" + self.USER.id + "-events");
        }
    }

    static addAjaxProcessors() {
        // Add the csrf cookie and credential for all requests
        Ajax.addPreprocessor((options) => {
            options.credentials = options.credentials || "include";
            options.headers.set("X-CSRFToken", getCookie("csrftoken"));
        });

        // Add a postprocessor to load any state received from an Ajax response
        Ajax.addPostprocessor((payload) => {
            payload.state && GlobalState.importState(payload.state);
        });

        // Raise any error, to be handled by the error processor
        Ajax.addPostprocessor((payload) => {
            if (payload.error) {
                throw payload.error;
            }
        });

        // Prettify any error, so it's in a standardized format
        Ajax.addErrorPostprocessor((error) => {
            return ErrorHandlers.wrapError(error);
        });

        // Add a default error handler
        Ajax.errorHandler = (error) => ErrorHandlers.showErrorAlert(error);
    }
}
