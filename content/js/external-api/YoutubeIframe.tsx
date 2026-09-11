import {UI, type ElementOptions} from "../../../../stemjs/ui/UIBase";
import {ensure} from "../../../../stemjs/base/Require";
import {NOOP_FUNCTION} from "../../../../stemjs/base/Utils";


const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
const State = {
    NOT_STARTED: 1,
    LOADING: 2,
    LOADED: 3,
    ERROR: 4
};


// The slice of the YouTube iframe API this uses. Declared rather than depended on: the script is loaded
// from Youtube at runtime, and only these three members are ever touched
interface YoutubePlayer {
    addEventListener(event: string, callback: (...args: any[]) => void, ...extraArgs: unknown[]): void;
    destroy(): void;
}

interface YoutubeAPI {
    Player: new (node: HTMLElement, options: {height?: number | string; width?: number | string; videoId?: string}) => YoutubePlayer;
}

export interface YoutubeIframeOptions {
    videoId?: string;
}

export class YoutubeIframe extends UI.Element {
    declare options: ElementOptions<YoutubeIframeOptions>;
    // Listener registrations queued until the player exists: the event, the callback, extra arguments
    declare _delayedListeners?: [event: string, callback: (...args: any[]) => void, ...extraArgs: unknown[]][];
    declare player: YoutubePlayer;
    // Run once the YT global has loaded, then dropped
    declare static _registeredCallbacks?: (() => void)[];
    declare static youtubeAPI: YoutubeAPI;

    static PLAYER_EVENTS = ["onReady", "onStateChange", "onPlaybackQualityChange", "onPlaybackRateChange", "onError", "onApiChange"];
    static YOUTUBE_API_STATE = State.NOT_STARTED;

    static ensureYoutubeAPI() {
        if (this.YOUTUBE_API_STATE === State.NOT_STARTED) {
            ensure(YOUTUBE_API_SRC, NOOP_FUNCTION);
            this.YOUTUBE_API_STATE = State.LOADING;

            // I do not like this pattern, Youtube...
            self.onYouTubeIframeAPIReady = () => {
                this.YOUTUBE_API_STATE = State.LOADED;
                this.youtubeAPI = YT;
                for (const callback of this._registeredCallbacks) {
                    callback();
                }
                delete this._registeredCallbacks;
            }
        }

    }

    static registerDelayedCallback(callback: () => void) {
        if (!this._registeredCallbacks) {
            this._registeredCallbacks = [];
            this.ensureYoutubeAPI();
        }
        this._registeredCallbacks.push(callback);
    }

    static onYoutubeLoaded(callback: () => void) {
        if (this.YOUTUBE_API_STATE === State.LOADED) {
            callback();
            return;
        }
        if (this.YOUTUBE_API_STATE === State.ERROR) {
            throw Error("The Youtube API could not be reached.");
        }
        this.registerDelayedCallback(callback);
    }

    getDefaultOptions() {
        return {
            height: 270,
            width: 480
        };
    }

    getPlayer() {
        return this.player;
    }

    initializeYoutube() {
        this.player = new this.constructor.youtubeAPI.Player(this.node, {
            height: this.options.height,
            width: this.options.width,
            videoId: this.options.videoId
        });
        if (this._delayedListeners) {
            for (const delayedListener of this._delayedListeners) {
                this.getPlayer().addEventListener(...delayedListener);
            }
            delete this._delayedListeners;
        }
    }

    onMount() {
        this.constructor.onYoutubeLoaded(
            () => this.initializeYoutube()
        );
    }

    onUnmount() {
        this.getPlayer() && this.getPlayer().destroy();
    }
}
for (const playerEvent of YoutubeIframe.PLAYER_EVENTS) {
    // extraArgs stays open: this installs a listener adder per player event, and each takes its own
    YoutubeIframe.prototype["add" + playerEvent.substring(2) + "Listener"] = function(callback: () => void, ...extraArgs: any[]) {
        const player = this.getPlayer();
        if (player) {
            player.addEventListener(playerEvent, callback);
        } else {
            this._delayedListeners = this._delayedListeners || [];
            this._delayedListeners.push([playerEvent, callback, ...extraArgs]);
        }
    }
}