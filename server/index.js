import open from 'open'
import { resolve } from 'node:path'
import osc from 'osc'
import express from 'express'
import WebSocket from 'ws'
import os from 'os'

var getIPAddresses = function () {
    const interfaces = os.networkInterfaces()
    const ipAddresses = []

    for (var deviceName in interfaces) {
        const addresses = interfaces[deviceName];
        for (var i = 0; i < addresses.length; i++) {
            const addressInfo = addresses[i];
            if (addressInfo.family === "IPv4" && !addressInfo.internal) {
                ipAddresses.push(addressInfo.address);
            }
        }
    }

    return ipAddresses;
};

// Bind to a UDP socket to listen for incoming OSC events.
var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 57121
});

udpPort.on("ready", function () {
    const ipAddresses = getIPAddresses();
    console.log("Listening for OSC over UDP.");
    ipAddresses.forEach(function (address) {
        console.log(" Host:", address + ", Port:", udpPort.options.localPort);
    });
    open('http://localhost:3000')
    console.log("The application should open in your default browser at http://localhost:3000.");
});

udpPort.open();

// Create an Express-based Web Socket server to which OSC messages will be relayed.
const appResources = resolve('build')
const app = express()
const server = app.listen(3000)
const wss = new WebSocket.Server({
    server: server
});

app.use("/", express.static(appResources));
wss.on("connection", function (socket) {
    console.log("A Web Socket connection has been established!");
    const socketPort = new osc.WebSocketPort({
        socket: socket
    });

    const relay = new osc.Relay(udpPort, socketPort, {
        raw: true
    });
});
