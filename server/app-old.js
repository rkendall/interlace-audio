var osc = require("osc"),
    http = require("http"),
    WebSocket = require("ws");

// Create an Express server app
// and serve up a directory of static files.
var app = require("express").express(),
    server = app.listen(8081);

app.use("/", express.static(__dirname + "/static"));

// Listen for Web Socket requests.
var wss = new WebSocket.Server({
    server: server
});

// Listen for Web Socket connections.
wss.on("connection", function (socket) {
    var socketPort = new osc.WebSocketPort({
        socket: socket,
        metadata: true
    });

    socketPort.on("message", function (oscMsg) {
        console.log("An OSC Message was received!", oscMsg);
    });
});
