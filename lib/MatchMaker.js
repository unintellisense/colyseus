"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var memshared = require("memshared");
var msgpack = require("msgpack-lite");
var Utils_1 = require("./Utils");
var index_1 = require("./index");
var Debug_1 = require("./Debug");
;
var MatchMaker = (function () {
    function MatchMaker() {
        var _this = this;
        this.handlers = {};
        this.availableRooms = {};
        this.roomsById = {};
        this.roomCount = 0;
        // room references by client id
        this.sessions = {};
        this.connectingClientByRoom = {};
        this.onClientLeaveRoom = function (room, client, isDisconnect) {
            if (isDisconnect) {
                return true;
            }
            delete _this.sessions[client.sessionId];
        };
    }
    MatchMaker.prototype.execute = function (client, message) {
        if (message[0] == index_1.Protocol.JOIN_ROOM) {
            this.onJoinRoomRequest(message[1], message[2], false, function (err, room) {
                if (err) {
                    var roomId = (room) ? room.roomId : message[1];
                    client.send(msgpack.encode([index_1.Protocol.JOIN_ERROR, roomId, err]), { binary: true });
                }
            });
        }
        else if (message[0] == index_1.Protocol.ROOM_DATA) {
            // send message directly to specific room
            var room = this.getRoomById(message[1]);
            if (room) {
                room.onMessage(client, message[2]);
            }
        }
        else {
            this.sessions[client.sessionId].onMessage(client, message);
        }
    };
    /**
     * Create/joins a particular client in a room running in a worker process.
     *
     * The client doesn't join instantly because this method is called from the
     * match-making process. The client will request a new WebSocket connection
     * to effectively join into the room created/joined by this method.
     */
    MatchMaker.prototype.onJoinRoomRequest = function (roomToJoin, clientOptions, allowCreateRoom, callback) {
        var room;
        var err;
        clientOptions.sessionId = index_1.generateId();
        if (!this.hasHandler(roomToJoin) && index_1.isValidId(roomToJoin)) {
            room = this.joinById(roomToJoin, clientOptions);
        }
        else {
            room = this.requestToJoinRoom(roomToJoin, clientOptions).room
                || (allowCreateRoom && this.create(roomToJoin, clientOptions));
        }
        if (room) {
            //
            // Reserve a seat for clientId
            //
            if (!this.connectingClientByRoom[room.roomId]) {
                this.connectingClientByRoom[room.roomId] = {};
            }
            this.connectingClientByRoom[room.roomId][clientOptions.clientId] = clientOptions;
        }
        else {
            err = "join_request_fail";
        }
        callback(err, room);
    };
    /**
     * Binds target client to the room running in a worker process.
     */
    MatchMaker.prototype.onJoin = function (roomId, client, callback) {
        var room = this.roomsById[roomId];
        var clientOptions = this.connectingClientByRoom[roomId][client.id];
        var err;
        // assign sessionId to socket connection.
        client.sessionId = clientOptions.sessionId;
        delete clientOptions.sessionId;
        delete clientOptions.clientId;
        try {
            room._onJoin(client, clientOptions);
            room.once('leave', this.onClientLeaveRoom.bind(this, room));
            this.sessions[client.sessionId] = room;
        }
        catch (e) {
            console.error(room.roomName, "onJoin:", e.stack);
            client.send(msgpack.encode([index_1.Protocol.JOIN_ERROR, roomId, e.message]), { binary: true });
        }
        callback(err, room);
    };
    MatchMaker.prototype.onLeave = function (client, room) {
        room._onLeave(client, true);
    };
    MatchMaker.prototype.addHandler = function (name, handler, options) {
        if (options === void 0) { options = {}; }
        this.handlers[name] = [handler, options];
        this.availableRooms[name] = [];
    };
    MatchMaker.prototype.hasHandler = function (name) {
        return this.handlers[name] !== undefined;
    };
    MatchMaker.prototype.hasAvailableRoom = function (roomName) {
        return (this.availableRooms[roomName] &&
            this.availableRooms[roomName].length > 0);
    };
    MatchMaker.prototype.getRoomById = function (roomId) {
        return this.roomsById[roomId];
    };
    MatchMaker.prototype.joinById = function (roomId, clientOptions) {
        var room = this.roomsById[roomId];
        if (!room) {
            console.error("Error: trying to join non-existant room \"" + roomId + "\"");
        }
        else if (!room.requestJoin(clientOptions)) {
            console.error("Error can't join \"" + clientOptions.roomName + "\" with options: " + JSON.stringify(clientOptions));
            room = undefined;
        }
        return room;
    };
    MatchMaker.prototype.requestToJoinRoom = function (roomName, clientOptions) {
        var room;
        var bestScore = 0;
        if (this.hasAvailableRoom(roomName)) {
            for (var i = 0; i < this.availableRooms[roomName].length; i++) {
                var availableRoom = this.availableRooms[roomName][i];
                var numConnectedClients = availableRoom.clients.length + this.connectingClientByRoom[availableRoom.roomId].length;
                // Check maxClients before requesting to join.
                if (numConnectedClients >= availableRoom.maxClients) {
                    continue;
                }
                var score = availableRoom.requestJoin(clientOptions);
                if (score > bestScore) {
                    bestScore = score;
                    room = availableRoom;
                }
            }
        }
        return {
            room: room,
            score: bestScore
        };
    };
    MatchMaker.prototype.create = function (roomName, clientOptions) {
        var room = null, handler = this.handlers[roomName][0], options = this.handlers[roomName][1];
        room = new handler();
        // set room options
        room.roomId = index_1.generateId();
        room.roomName = roomName;
        if (room.onInit) {
            room.onInit(options);
        }
        // cache on which process the room is living.
        memshared.set(room.roomId, process.pid);
        // imediatelly ask client to join the room
        if (room.requestJoin(clientOptions)) {
            Debug_1.debugMatchMaking("spawning '%s' on worker %d", roomName, process.pid);
            room.on('lock', this.lockRoom.bind(this, roomName, room));
            room.on('unlock', this.unlockRoom.bind(this, roomName, room));
            room.once('dispose', this.disposeRoom.bind(this, roomName, room));
            this.roomsById[room.roomId] = room;
            // room always start unlocked
            this.unlockRoom(roomName, room);
        }
        else {
            room = null;
        }
        return room;
    };
    MatchMaker.prototype.lockRoom = function (roomName, room) {
        if (this.hasAvailableRoom(roomName)) {
            var roomIndex = this.availableRooms[roomName].indexOf(room);
            if (roomIndex !== -1) {
                // decrease number of rooms spawned on this worker
                memshared.decr(process.pid.toString());
            }
            Utils_1.spliceOne(this.availableRooms[roomName], roomIndex);
        }
        //
        // if current worker doesn't have any 'rooName' handlers available
        // anymore, remove it from the list.
        //
        if (!this.hasAvailableRoom(roomName)) {
            memshared.srem(room.roomName, process.pid);
        }
    };
    MatchMaker.prototype.unlockRoom = function (roomName, room) {
        if (this.availableRooms[roomName].indexOf(room) === -1) {
            this.availableRooms[roomName].push(room);
            // flag current worker has this room id
            memshared.sadd(room.roomName, process.pid);
            // increase number of rooms spawned on this worker
            memshared.incr(process.pid.toString());
        }
    };
    MatchMaker.prototype.disposeRoom = function (roomName, room) {
        Debug_1.debugMatchMaking("disposing '%s' on worker %d", roomName, process.pid);
        delete this.roomsById[room.roomId];
        // remove from cache
        memshared.del(room.roomId);
        // remove from available rooms
        this.lockRoom(roomName, room);
    };
    return MatchMaker;
}());
exports.MatchMaker = MatchMaker;
