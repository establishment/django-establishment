import {StemApp} from "../../../stemjs/src/app/StemApp";
import {Ajax} from "../../../stemjs/src/base/Ajax";
import {getCookie} from "../../../stemjs/src/base/Utils";
import {GlobalState, StateLoadOptions} from "../../../stemjs/src/state/State";
import {StemDate} from "../../../stemjs/src/time/Date";
import {ServerTime} from "../../../stemjs/src/time/Time";
import {ViewportMeta} from "../../../stemjs/src/ui/ViewportMeta";

import {WebsocketSubscriber} from "../../../stemjs/src/websocket/client/WebsocketSubscriber";
import {ErrorHandlers} from "./ErrorHandlers";
import {GlobalStyleSheet} from "./GlobalStyleSheet";
import {FetchOptions, XHRPromise} from "../../../stemjs/src/base/Fetch";

// Global type extensions
declare global {
    interface Window {
        PUBLIC_STATE?: any;
    }
}

type AjaxResponsePayload = StateLoadOptions & {
    error?: any;
}

export class EstablishmentApp extends StemApp {
    static MIN_VIEWPORT_META_WIDTH: number = 375; // Iphone 6
    static viewportMeta: ViewportMeta;

    static init(): EstablishmentApp {
        this.loadPublicState();
        this.addAjaxProcessors();
        this.registerWebsocketStreams();
        this.initializeViewportMeta();
        this.configureTheme();
        this.initializeGlobalStyle();
        return super.init();
    }

    static loadPublicState(): void {
        GlobalState.importState(globalThis.PUBLIC_STATE || {});
    }

    static addAjaxProcessors(): void {
        // Add the csrf cookie and credential for all requests
        Ajax.addPreprocessor((options: FetchOptions) => {
            options.credentials = options.credentials || "include";
            if (options.headers instanceof Headers) {
                options.headers.set("X-CSRFToken", getCookie("csrftoken"));
            }
        });

        // Add a postprocessor to load any state received from an Ajax response
        Ajax.addPostprocessor((payload: AjaxResponsePayload, xhrPromise: XHRPromise) => {
            if ((payload.state || payload.events) && !xhrPromise.options.disableStateImport) {
                GlobalState.importState(payload);
            }
        });

        // Sync server time
        Ajax.addPostprocessor((payload: AjaxResponsePayload, xhrPromise: XHRPromise) => {
            const responseHeaders = xhrPromise.getResponseHeaders();
            const responseDate = responseHeaders.get("date");
            if (responseDate) {
                // Estimate server time, with 500ms rounding and 100 ms latency
                const estimatedServerTime = new StemDate(responseDate).add(600);
                ServerTime.set(estimatedServerTime, true);
            }
        });

        // Raise any error, to be handled by the error processor
        Ajax.addPostprocessor((payload: AjaxResponsePayload) => {
            if (payload.error) {
                throw payload.error;
            }
        });

        // Prettify any error, so it's in a standardized format
        Ajax.addErrorPostprocessor((error: any) => {
            console.error("Ajax error", error);
            return ErrorHandlers.wrapError(error);
        });

        // Add a default error handler
        Ajax.errorHandler = (error: any) => ErrorHandlers.showErrorAlert(error);
    }

    static registerWebsocketStreams(): void {
        // TODO: first check if websockets are enabled
        (GlobalState as any).registerStream = function (streamName: string): void {
            WebsocketSubscriber.addListener(streamName, (GlobalState as any).applyEventWrapper);
        };

        //Register on the global event stream
        (GlobalState as any).registerStream("global-events");

        //Register on the user event stream
        if (self.USER?.id) {
            (GlobalState as any).registerStream("user-" + self.USER.id + "-events");
        }
    }

    static initializeViewportMeta(): ViewportMeta {
        return this.viewportMeta = ViewportMeta.create(document.head);
    }

    static configureTheme(): void {
        // Nothing to do by default
    }

    static initializeGlobalStyle(): void {
        (GlobalStyleSheet as any).initialize();
    }
}
