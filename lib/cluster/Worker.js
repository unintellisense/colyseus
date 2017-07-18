"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var memshared = require("memshared");
var http = require("http");
var msgpack = require("msgpack-lite");
var parseURL = require("url-parse");
var uws_1 = require("uws");
var Protocol_1 = require("../Protocol");
var _1 = require("../");
/**
 * Retrieve and/or set 'colyseusid' cookie.
 */
function setUserId(client) {
    var url = client.upgradeReq.url;
    client.id = url.query['colyseusid'] || _1.generateId();
    if (!url.query['colyseusid']) {
        client.send(msgpack.encode([Protocol_1.Protocol.USER_ID, client.id]), { binary: true });
    }
}
exports.setUserId = setUserId;
function handleUpgrade(server, socket, message) {
    var code = message[0];
    var upgradeReq = message[1];
    var head = message[2];
    var url = parseURL(message[3], true);
    upgradeReq.url = url;
    upgradeReq.roomId = url.pathname.substr(1);
    // assign client socket to request
    upgradeReq.connection = socket;
    // handle 'upgrade' of the WebSocket connection in the worker node
    server.emit('upgrade', upgradeReq, socket, head);
    socket.resume();
}
exports.handleUpgrade = handleUpgrade;
function setupWorker(server, matchMaker) {
    var wss = new uws_1.Server({ server: server });
    // setInterval(() => console.log(`worker ${ process.pid } connections:`, wss.clients.length), 1000);
    wss.on("connection", function (client) {
        setUserId(client);
        var roomId = client.upgradeReq.roomId;
        matchMaker.onJoin(roomId, client, function (err, room) {
            if (!err) {
                client.on('message', function (message) {
                    // TODO: unify this with matchmaking/Process
                    try {
                        // try to decode message received from client
                        message = msgpack.decode(Buffer.from(message));
                    }
                    catch (e) {
                        console.error("Couldn't decode message:", message, e.stack);
                        return;
                    }
                    matchMaker.execute(client, message);
                });
                client.on('close', function () {
                    matchMaker.onLeave(client, room);
                });
                client.on('error', function (e) {
                    console.error("[ERROR]", client.id, e);
                });
            }
        });
    });
    process.on('message', function (message, socket) {
        var roomNameOrId = message[1];
        var joinOptions = message[2];
        var allowCreateRoom = (message[0] === Protocol_1.Protocol.CREATE_ROOM);
        if (message[0] === Protocol_1.Protocol.PASS_HTTP_SOCKET) {
            server.emit('connection', socket);
            // re-create request for incoming socket
            var request = new http.ClientRequest();
            request.headers = message[1].headers;
            request.method = message[1].method;
            request.url = message[1].url;
            request.connection = socket;
            request._readableState = socket._readableState;
            // TODO / FIXME:
            //
            // should we flush something here?
            // '_flush' method has been lost after redirecting the socket
            //
            request._flush = function () { };
            // emit request to server
            socket.parser.onIncoming(request);
            socket.resume();
            // This is way too hacky.
            request.emit('data', message[1].body);
            request.emit('end');
            return;
        }
        else if (message[0] === Protocol_1.Protocol.PASS_WEBSOCKET) {
            handleUpgrade(server, socket, message);
            return;
        }
        else if (message[0] === Protocol_1.Protocol.REQUEST_JOIN_ROOM) {
            var _a = matchMaker.requestToJoinRoom(message[1], message[2]), room_1 = _a.room, score_1 = _a.score;
            // send response back to match-making process.
            getMatchMakingProcess(function (matchMakingPid) {
                console.log("process", process.pid, "is responding to REQUEST_JOIN_ROOM");
                process.send([matchMakingPid, joinOptions.clientId, process.pid, room_1.roomId, score_1]);
            });
        }
        else if (allowCreateRoom || message[0] === Protocol_1.Protocol.JOIN_ROOM) {
            matchMaker.onJoinRoomRequest(roomNameOrId, joinOptions, allowCreateRoom, function (err, room) {
                var joinRoomResponse;
                if (err) {
                    joinRoomResponse = [Protocol_1.Protocol.JOIN_ERROR, roomNameOrId, err];
                }
                else {
                    joinRoomResponse = [Protocol_1.Protocol.JOIN_ROOM, room.roomId];
                }
                // send response back to match-making process.
                getMatchMakingProcess(function (matchMakingPid) {
                    process.send([matchMakingPid, joinOptions.clientId, joinRoomResponse]);
                });
            });
        }
    });
    return server;
}
exports.setupWorker = setupWorker;
function getMatchMakingProcess(callback) {
    memshared.get("matchmaking_process", function (err, matchMakingPid) {
        callback(matchMakingPid);
    });
}
