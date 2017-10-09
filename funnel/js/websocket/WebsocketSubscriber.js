import {Dispatchable} from "base/Dispatcher";
import {WebsocketStreamHandler} from "./WebsocketStreamHandler";

class WebsocketSubscriber extends Dispatchable {
    static ConnectionStatus = {
        NONE: 0,
        CONNECTING: 1,
        CONNECTED: 2,
        DISCONNECTED: 3
    };

    static StreamStatus = {
        NONE: 0,
        SUBSCRIBING: 1,
        SUBSCRIBED: 2,
        UNSUBSCRIBED: 3
    };

    static STREAM_SUBSCRIBE_TIMEOUT = 3000;
    static STREAM_SUBSCRIBE_MAX_TIMEOUT = 30000;

    static CONNECT_RETRY_TIMEOUT = 3000;
    static CONNECT_RETRY_MAX_TIMEOUT = 30000;

    static HEARTBEAT_MESSAGE = "-hrtbt-";

    constructor(url=self.WEBSOCKET_URL) {
        super();
        this.url = url;
        this.streamHandlers = new Map();
        this.attemptedConnect = false;
        this.connectionStatus = WebsocketSubscriber.ConnectionStatus.NONE;
        this.websocket = null;
        this.failedReconnectAttempts = 0;
        // TODO: streamStatus should be merged with streamHandlers
        this.streamStatus = new Map();
        //TODO: should probably try to connect right now!
    }

    setConnectionStatus(connectionStatus) {
        this.connectionStatus = connectionStatus;
        this.dispatch("connectionStatus", connectionStatus);
    }

    newConnection() {
        return new WebSocket(this.url);
    }

    connect() {
        this.setConnectionStatus(WebsocketSubscriber.ConnectionStatus.CONNECTING);
        try {
            console.log("WebsocketSubscriber: Connecting to " + this.url + " ...");
            this.websocket = this.newConnection();
            this.websocket.onopen = () => {
                this.onWebsocketOpen();
            };
            this.websocket.onmessage = (event) => {
                this.onWebsocketMessage(event);
            };
            this.websocket.onerror = (event) => {
                this.onWebsocketError(event);
            };
            this.websocket.onclose = (event) => {
                this.onWebsocketClose(event);
            };

        } catch (e) {
            this.tryReconnect();
            console.error("WebsocketSubscriber: Failed to connect to ", this.url, "\nError: ", e.message);
        }
    }

    tryReconnect() {
        let reconnectWait = Math.min(WebsocketSubscriber.CONNECT_RETRY_TIMEOUT * this.failedReconnectAttempts,
                                     WebsocketSubscriber.CONNECT_RETRY_MAX_TIMEOUT);

        this.failedReconnectAttempts++;

        if (!this.reconnectTimeout) {
            this.reconnectTimeout = setTimeout(() => {
                this.reconnectTimeout = null;
                console.log("WebsocketSubscriber: Trying to reconnect websocket connection");
                this.connect();
            }, reconnectWait);
        }
    }

    // Stream options:
    // rawMessage = true means we won't try to decode a json object from the message
    // parseMayFail = true means that we'll pass the raw message if JSON.parse fails
    subscribe(streamName) {
        // TODO: make sure to not explicitly support streams with spaces in the name
        console.log("WebsocketSubscriber: Subscribing to stream ", streamName);

        if (!this.attemptedConnect) {
            this.connect();
            this.attemptedConnect = true;
        }

        if (this.streamHandlers.has(streamName)) {
            console.warning("WebsocketSubscriber: Already subscribed to stream ", streamName);
            return;
        }

        // Check if the websocket connection is open
        if (this.websocket && this.websocket.readyState === 1) {
            this.sendSubscribe(streamName);
        }   //TODO: no else?

        let streamHandler = new WebsocketStreamHandler(streamName);
        this.streamHandlers.set(streamName, streamHandler);
        return streamHandler;
    }

    canSendSubscribe(streamName) {
        if (this.streamStatus.has(streamName)) {
            let streamStatus = this.streamStatus.get(streamName);
            return streamStatus.status == WebsocketSubscriber.StreamStatus.UNSUBSCRIBED ||
                    streamStatus.status == WebsocketSubscriber.StreamStatus.NONE;
        }
        return true;
    }

    updateStreamStatus(streamName, index) {
        let streamStatus = null;
        if (!this.streamStatus.has(streamName)) {
            streamStatus = {
                index: index,
                status: WebsocketSubscriber.StreamStatus.SUBSCRIBING,
                checkTimeout: null,
                tryCount: 0,
            };
        } else {
            streamStatus = this.streamStatus.get(streamName);
            streamStatus.status = WebsocketSubscriber.StreamStatus.SUBSCRIBING;
        }
        if (streamStatus.checkTimeout != null) {
            clearTimeout(streamStatus.checkTimeout);
            streamStatus.checkTimeout = null;
        }
        streamStatus.tryCount ++;
        let streamTimeout = Math.min(WebsocketSubscriber.STREAM_SUBSCRIBE_TIMEOUT * streamStatus.tryCount,
                                     WebsocketSubscriber.STREAM_SUBSCRIBE_MAX_TIMEOUT);
        streamStatus.checkTimeout = setTimeout(() => {
            this.subscribeTimeout(streamName);
        }, streamTimeout);
        this.streamStatus.set(streamName, streamStatus);
    }

    subscribeTimeout(streamName) {
        console.log("WebsocketSubscriber: stream subscribe timeout for #" + streamName +
                    " reached! Trying to resubscribe again!");
        let streamStatus = this.streamStatus.get(streamName);
        streamStatus.checkTimeout = null;
        streamStatus.status = WebsocketSubscriber.StreamStatus.NONE;
        if (streamStatus.index) {
            this.sendResubscribe(streamName, streamStatus.index);
        } else {
            this.sendSubscribe(streamName);
        }
    }

    sendSubscribe(streamName) {
        if (this.canSendSubscribe(streamName)) {
            this.send("s " + streamName);
            this.updateStreamStatus(streamName);
        }
    }

    sendResubscribe(streamName, index) {
        if (this.canSendSubscribe(streamName)) {
            this.send("r " + index + " " + streamName);
            this.updateStreamStatus(streamName, index);
        }
    }

    resubscribe() {
        // Iterate over all streams and resubscribe to them
        for (let key of this.streamHandlers.keys()) {
            if (this.streamHandlers.get(key).haveIndex()) {
                let index = this.streamHandlers.get(key).getLastIndex();
                console.log("WebsocketSubscriber: Sending (re)subscribe to indexed stream ", key, " from index ", index);
                this.sendResubscribe(key, index);
            } else {
                console.log("WebsocketSubscriber: Sending (re)subscribe to stream ", key);
                this.sendSubscribe(key);
            }
        }
    }

    onStreamSubscribe(streamName) {
        if (!this.streamStatus.has(streamName)) {
            console.error("WebsocketSubscriber: received subscribe success response for unrequested stream #" +
                          streamName);
        }
        let streamStatus = this.streamStatus.get(streamName);
        if (streamStatus.checkTimeout) {
            clearTimeout(streamStatus.checkTimeout);
            streamStatus.checkTimeout = null;
        }
        streamStatus.status = WebsocketSubscriber.StreamStatus.SUBSCRIBED;
    }

    onWebsocketOpen() {
        this.previousFailedReconnectAttempts = this.failedReconnectAttempts;
        this.failedReconnectAttempts = 0;
        console.log("WebsocketSubscriber: Websocket connection established!");

        this.reset();
        this.setConnectionStatus(WebsocketSubscriber.ConnectionStatus.CONNECTED);
        this.resubscribe();
    }

    processStreamPacket(packet) {
        let firstSpace = packet.indexOf(" ");
        let streamName, afterStreamName;
        if (firstSpace > 0) {
            streamName = packet.substr(0, firstSpace).trim();
            afterStreamName = packet.substr(firstSpace + 1).trim();
        } else {
            console.error("WebsocketSubscriber: Could not process stream packet: " + packet);
            return;
        }

        let streamHandler = this.streamHandlers.get(streamName);
        // TODO: have a special mode if no handler is registered
        if (!streamHandler) {
            console.error("WebsocketSubscriber: No handler for websocket stream ", streamName);
            return;
        }
        streamHandler.processPacket(afterStreamName);
    }

    fatalErrorClose(data) {
        this.failedReconnectAttempts = this.previousFailedReconnectAttempts;
        console.error("WebsocketSubscriber: server fatal error close: ", data);
        this.onWebsocketError(data);
    }

    onWebsocketMessage(event) {
        if (event.data === WebsocketSubscriber.HEARTBEAT_MESSAGE) {
            // TODO: keep track of the last heartbeat timestamp
        } else {
            let firstSpace = event.data.indexOf(" ");
            let type, payload;

            if (firstSpace > 0) {
                type = event.data.substr(0, firstSpace).trim();
                payload = event.data.substr(firstSpace + 1).trim();
            } else {
                type = event.data;
                payload = "";
            }

            if (type === "e" || type === "error") { // error
                console.error("WebsocketSubscriber: Websocket error: ", payload);
                payload = payload.split(" ")
                const errorType = payload[0];
                if (errorType === "invalidSubscription") {
                    // Stop trying to resubscribe to a stream that's been rejected by the server
                    const streamName = payload[1];
                    const streamStatus = this.streamStatus.get(streamName);
                    if (streamStatus && streamStatus.checkTimeout != null) {
                        clearTimeout(streamStatus.checkTimeout);
                        streamStatus.checkTimeout = null;
                    }
                }
            } else if (type === "s") { // subscribed
                console.log("WebsocketSubscriber: Successfully subscribed to stream ", payload);
                this.onStreamSubscribe(payload);
            } else if (type === "m") { // stream message
                this.processStreamPacket(payload);
            } else if (type  === "c") { // command
                this.dispatch("serverCommand", payload);
            } else if (type == "efc") { // error - fatal - close
                this.fatalErrorClose(payload);
            } else {
                console.error("WebsocketSubscriber: Can't process " + event.data);
            }
        }
    }

    reset() {
        this.setConnectionStatus(WebsocketSubscriber.ConnectionStatus.DISCONNECTED);
        for (let streamStatus of this.streamStatus) {
            if (streamStatus.checkTimeout) {
                clearTimeout(streamStatus.checkTimeout);
            }
        }
        this.streamStatus.clear();
    }

    onWebsocketError(event) {
        console.error("WebsocketSubscriber: Websocket connection is broken!");
        this.reset();
        this.tryReconnect();
    }

    onWebsocketClose(event) {
        console.log("WebsocketSubscriber: Connection closed!");
        this.reset();
        this.tryReconnect();
    }

    send(message) {
        // TODO: if the websocket is not open, enqueue WebsocketSubscriber message to be sent on open or just fail?
        this.websocket.send(message);
    }

    getStreamHandler(streamName) {
        let streamHandler = this.streamHandlers.get(streamName);
        if (!streamHandler) {
            streamHandler = this.subscribe(streamName);
        }
        return streamHandler;
    }

    // this should be pretty much the only external function
    addStreamListener(streamName, callback) {
        let streamHandler = this.getStreamHandler(streamName);
        if (streamHandler.callbackExists(callback)) {
            return;
        }
        streamHandler.addListener(callback);
    }

    static addListener(streamName, callback) {
        return this.Global.addStreamListener(streamName, callback);
    };
}

WebsocketSubscriber.Global = new WebsocketSubscriber();

export {WebsocketSubscriber};
