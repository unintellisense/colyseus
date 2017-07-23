"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var events_1 = require("events");
var uws_1 = require("uws");
var Protocol_1 = require("./Protocol");
var MatchMaker_1 = require("./MatchMaker");
var Utils_1 = require("./Utils");
var shortid = require("shortid");
var msgpack = require("msgpack-lite");
// // memory debugging
// setInterval(function() { console.log(require('util').inspect(process.memoryUsage())); }, 1000)
var Server = (function (_super) {
    __extends(Server, _super);
    function Server(options) {
        var _this = _super.call(this) || this;
        _this.matchMaker = new MatchMaker_1.MatchMaker();
        // room references by client id
        _this.clients = {};
        _this.onConnect = function (client) {
            var clientId = shortid.generate();
            client.id = clientId;
            client.send(msgpack.encode([Protocol_1.Protocol.USER_ID, clientId]), { binary: true });
            client.on('message', _this.onMessage.bind(_this, client));
            client.on('error', _this.onError.bind(_this, client));
            client.on('close', _this.onDisconnect.bind(_this, client));
            _this.clients[clientId] = [];
            _this.emit('connect', client);
        };
        _this.onClientLeaveRoom = function (room, client, isDisconnect) {
            if (isDisconnect) {
                return true;
            }
            var roomIndex = _this.clients[client.id].indexOf(room);
            if (roomIndex >= 0) {
                Utils_1.spliceOne(_this.clients[client.id], roomIndex);
            }
        };
        if (options) {
            _this.attach(options);
        }
        return _this;
    }
    /**
     * Attaches Colyseus server to a server or port.
     */
    Server.prototype.attach = function (options) {
        if (options.server || options.port) {
            this.server = new uws_1.Server(options);
        }
        else {
            this.server = options.ws;
        }
        this.server.on('connection', this.onConnect);
    };
    /**
     * @example Registering with room name + class handler
     *    server.register("room_name", RoomHandler)
     *
     * @example Registering with room name + class handler + custom options
     *    server.register("area_1", AreaHandler, { map_file: "area1.json" })
     *    server.register("area_2", AreaHandler, { map_file: "area2.json" })
     *    server.register("area_3", AreaHandler, { map_file: "area3.json" })
     */
    Server.prototype.register = function (name, handler, options) {
        this.matchMaker.addHandler(name, handler, options);
    };
    Server.prototype.onError = function (client, e) {
        console.error("[ERROR]", client.id, e);
    };
    Server.prototype.onMessage = function (client, data) {
        var message;
        // try to decode message received from client
        try {
            message = msgpack.decode(Buffer.from(data));
        }
        catch (e) {
            console.error("Couldn't decode message:", data, e.stack);
            return;
        }
        this.emit('message', client, message);
        if (typeof (message[0]) === "number" && message[0] == Protocol_1.Protocol.JOIN_ROOM) {
            this.onJoinRoomRequest(client, message[1], message[2], function (err, room) {
                if (err) {
                    var roomId = (room) ? room.roomId : message[1];
                    client.send(msgpack.encode([Protocol_1.Protocol.JOIN_ERROR, roomId, err]), { binary: true });
                    if (room)
                        room._onLeave(client);
                }
            });
        }
        else if (typeof (message[0]) === "number" && message[0] == Protocol_1.Protocol.LEAVE_ROOM) {
            // trigger onLeave directly to specific room
            var room = this.matchMaker.getRoomById(message[1]);
            if (room)
                room._onLeave(client);
        }
        else if (typeof (message[0]) === "number" && message[0] == Protocol_1.Protocol.ROOM_DATA) {
            // send message directly to specific room
            var room = this.matchMaker.getRoomById(message[1]);
            if (room)
                room.onMessage(client, message[2]);
        }
        else {
            this.clients[client.id].forEach(function (room) { return room.onMessage(client, message); });
        }
    };
    Server.prototype.onJoinRoomRequest = function (client, roomToJoin, clientOptions, callback) {
        var room;
        var err;
        if (typeof (roomToJoin) === "string") {
            room = this.matchMaker.joinOrCreateByName(client, roomToJoin, clientOptions || {});
        }
        else {
            room = this.matchMaker.joinById(client, roomToJoin, clientOptions);
        }
        if (room) {
            try {
                room._onJoin(client, clientOptions);
            }
            catch (e) {
                console.error(room.roomName, "onJoin:", e.stack);
                err = e.message;
            }
            room.once('leave', this.onClientLeaveRoom.bind(this, room));
            this.clients[client.id].push(room);
        }
        else {
            err = "join_request_fail";
        }
        callback(err, room);
    };
    Server.prototype.onDisconnect = function (client) {
        this.emit('disconnect', client);
        // send leave message to all connected rooms
        this.clients[client.id].forEach(function (room) { return room._onLeave(client, true); });
        delete this.clients[client.id];
    };
    return Server;
}(events_1.EventEmitter));
exports.Server = Server;
