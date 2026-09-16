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
// from Youtube at runtime, and only its constructor and destroy are ever touched
interface YoutubePlayer {
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
    declare player: YoutubePlayer;
    // Run once the YT global has loaded, then dropped
    declare static registeredCallbacks?: (() => void)[];
    declare static youtubeAPI: YoutubeAPI;

    static YOUTUBE_API_STATE = State.NOT_STARTED;

    static ensureYoutubeAPI() {
        if (this.YOUTUBE_API_STATE === State.NOT_STARTED) {
            ensure(YOUTUBE_API_SRC, NOOP_FUNCTION);
            this.YOUTUBE_API_STATE = State.LOADING;

            // I do not like this pattern, Youtube...
            self.onYouTubeIframeAPIReady = () => {
                this.YOUTUBE_API_STATE = State.LOADED;
                this.youtubeAPI = YT;
                for (const callback of this.registeredCallbacks) {
                    callback();
                }
                delete this.registeredCallbacks;
            }
        }

    }

    static registerDelayedCallback(callback: () => void) {
        if (!this.registeredCallbacks) {
            this.registeredCallbacks = [];
            this.ensureYoutubeAPI();
        }
        this.registeredCallbacks.push(callback);
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