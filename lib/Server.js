"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const uws_1 = require("uws");
const Protocol_1 = require("./Protocol");
const MatchMaker_1 = require("./MatchMaker");
const Utils_1 = require("./Utils");
const shortid = require("shortid");
const msgpack = require("msgpack-lite");
// // memory debugging
// setInterval(function() { console.log(require('util').inspect(process.memoryUsage())); }, 1000)
class Server extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.matchMaker = new MatchMaker_1.MatchMaker();
        // room references by client id
        this.clients = {};
        this.onConnect = (client) => {
            let clientId = shortid.generate();
            client.id = clientId;
            client.send(msgpack.encode([Protocol_1.Protocol.USER_ID, clientId]), { binary: true });
            client.on('message', this.onMessage.bind(this, client));
            client.on('error', this.onError.bind(this, client));
            client.on('close', this.onDisconnect.bind(this, client));
            this.clients[clientId] = [];
            this.emit('connect', client);
        };
        this.onClientLeaveRoom = (room, client, isDisconnect) => {
            if (isDisconnect) {
                return true;
            }
            var roomIndex = this.clients[client.id].indexOf(room);
            if (roomIndex >= 0) {
                Utils_1.spliceOne(this.clients[client.id], roomIndex);
            }
        };
        if (options) {
            this.attach(options);
        }
    }
    /**
     * Attaches Colyseus server to a server or port.
     */
    attach(options) {
        if (options.server || options.port) {
            this.server = new uws_1.Server(options);
        }
        else {
            this.server = options.ws;
        }
        this.server.on('connection', this.onConnect);
    }
    /**
     * @example Registering with room name + class handler
     *    server.register("room_name", RoomHandler)
     *
     * @example Registering with room name + class handler + custom options
     *    server.register("area_1", AreaHandler, { map_file: "area1.json" })
     *    server.register("area_2", AreaHandler, { map_file: "area2.json" })
     *    server.register("area_3", AreaHandler, { map_file: "area3.json" })
     */
    register(name, handler, options) {
        this.matchMaker.addHandler(name, handler, options);
    }
    onError(client, e) {
        console.error("[ERROR]", client.id, e);
    }
    onMessage(client, data) {
        let message;
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
            this.onJoinRoomRequest(client, message[1], message[2], (err, room) => {
                if (err) {
                    let roomId = (room) ? room.roomId : message[1];
                    client.send(msgpack.encode([Protocol_1.Protocol.JOIN_ERROR, roomId, err]), { binary: true });
                    if (room)
                        room._onLeave(client);
                }
            });
        }
        else if (typeof (message[0]) === "number" && message[0] == Protocol_1.Protocol.LEAVE_ROOM) {
            // trigger onLeave directly to specific room
            let room = this.matchMaker.getRoomById(message[1]);
            if (room)
                room._onLeave(client);
        }
        else if (typeof (message[0]) === "number" && message[0] == Protocol_1.Protocol.ROOM_DATA) {
            // send message directly to specific room
            let room = this.matchMaker.getRoomById(message[1]);
            if (room)
                room.onMessage(client, message[2]);
        }
        else {
            this.clients[client.id].forEach(room => room.onMessage(client, message));
        }
    }
    onJoinRoomRequest(client, roomToJoin, clientOptions, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            var room;
            let err;
            if (typeof (roomToJoin) === "string") {
                room = yield this.matchMaker.joinOrCreateByName(client, roomToJoin, clientOptions || {});
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
        });
    }
    onDisconnect(client) {
        this.emit('disconnect', client);
        // send leave message to all connected rooms
        this.clients[client.id].forEach(room => room._onLeave(client, true));
        delete this.clients[client.id];
    }
}
exports.Server = Server;
