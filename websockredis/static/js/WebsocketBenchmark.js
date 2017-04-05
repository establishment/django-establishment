var GLOBAL_CONNECTIONS = 0;
var NUM_MESSAGES = 0;
var nrConnections = 20;
var streams = ["global_logging", "global-events", "user-1-events"];


WebsockConnection = function(id) {
    var obj = {
        id: id,
        timeInitiated: Date.now()
    };

    obj.websocket = new WebSocket(WEBSOCKET_URL);

    obj.websocket.onopen = function () {
        GLOBAL_CONNECTIONS += 1;
        console.log(GLOBAL_CONNECTIONS, " global connections, open");
        console.log("Connection delay: ", (Date.now() - obj.timeInitiated), " ms.");
        for (var i = 0; i < streams.length; i++) {
            obj.websocket.send("subscribe " + streams[i])
        }

        for (var i = 0; i < 30; i++) {
            var id = "" + Math.random() + "" + Math.random() + "" + Math.random() + "" + Math.random();
            obj.websocket.send("subscribe workspace-1-" + i);
        }
    };
    obj.websocket.onmessage = function (event) {
        NUM_MESSAGES += 1;
        console.log(NUM_MESSAGES, " received messages at ", Date.now(), event);
    };
    obj.websocket.onerror = function (event) {
        console.log("Websocket ", obj.id, " error: ", event);
    };
    obj.websocket.onclose = function (event) {
        GLOBAL_CONNECTIONS -= 1;
        console.log(GLOBAL_CONNECTIONS, " global connections, closed");
    };

    return obj;
};

function startConnections() {
    var connections = [];

    for (var i = 0; i < nrConnections; i++) {
        connections.push(WebsockConnection(i));
    }
}

startConnections();