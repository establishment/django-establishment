import {UI} from "ui/UI";
import {ensure} from "base/Require";
import {NOOP_FUNCTION} from "base/Utils";


const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
const State = {
    NOT_STARTED: 1,
    LOADING: 2,
    LOADED: 3,
    ERROR: 4
};


export class YoutubeIframe extends UI.Element {
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

    static registerDelayedCallback(callback) {
        if (!this._registeredCallbacks) {
            this._registeredCallbacks = [];
            this.ensureYoutubeAPI();
        }
        this._registeredCallbacks.push(callback);
    }

    static onYoutubeLoaded(callback) {
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
    YoutubeIframe.prototype["add" + playerEvent.substring(2) + "Listener"] = function(callback, ...extraArgs) {
        const player = this.getPlayer();
        if (player) {
            player.addEventListener(playerEvent, callback);
        } else {
            this._delayedListeners = this._delayedListeners || [];
            this._delayedListeners.push([playerEvent, callback, ...extraArgs]);
        }
    }
}