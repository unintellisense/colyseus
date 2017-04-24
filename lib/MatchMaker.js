"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Utils_1 = require("./Utils");
var MatchMaker = (function () {
    function MatchMaker() {
        this.handlers = {};
        this.availableRooms = {};
        this.roomsById = {};
        this.roomCount = 0;
    }
    MatchMaker.prototype.addHandler = function (name, handler, options) {
        if (options === void 0) { options = {}; }
        this.handlers[name] = [handler, options];
        this.availableRooms[name] = [];
    };
    MatchMaker.prototype.hasHandler = function (roomName) {
        return this.handlers[roomName] !== undefined;
    };
    MatchMaker.prototype.hasAvailableRoom = function (roomName) {
        return (this.availableRooms[roomName] &&
            this.availableRooms[roomName].length > 0);
    };
    MatchMaker.prototype.getRoomById = function (roomId) {
        return this.roomsById[roomId];
    };
    MatchMaker.prototype.joinById = function (client, roomId, clientOptions) {
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
    MatchMaker.prototype.joinOrCreateByName = function (client, roomName, clientOptions) {
        if (!this.hasHandler(roomName)) {
            console.error("Error: no available handler for \"" + roomName + "\"");
        }
        else {
            return this.requestJoin(client, roomName, clientOptions)
                || this.create(client, roomName, clientOptions);
        }
    };
    MatchMaker.prototype.requestJoin = function (client, roomName, clientOptions) {
        var room;
        if (this.hasAvailableRoom(roomName)) {
            for (var i = 0; i < this.availableRooms[roomName].length; i++) {
                var availableRoom = this.availableRooms[roomName][i];
                if (availableRoom.requestJoin(clientOptions)) {
                    room = availableRoom;
                    break;
                }
            }
        }
        return room;
    };
    MatchMaker.prototype.create = function (client, roomName, clientOptions) {
        var room = null, handler = this.handlers[roomName][0], options = this.handlers[roomName][1];
        // TODO:
        // keep track of available roomId's
        // try to use 0~127 in order to have lesser Buffer size
        options.roomId = this.roomCount++;
        options.roomName = roomName;
        room = new handler(Utils_1.merge(clientOptions, options));
        // imediatelly ask client to join the room
        if (room.requestJoin(clientOptions)) {
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
            var index = this.availableRooms[roomName].indexOf(room);
            if (index !== -1) {
                Utils_1.spliceOne(this.availableRooms[roomName], index);
            }
        }
    };
    MatchMaker.prototype.unlockRoom = function (roomName, room) {
        if (this.availableRooms[roomName].indexOf(room) === -1) {
            this.availableRooms[roomName].push(room);
        }
    };
    MatchMaker.prototype.disposeRoom = function (roomName, room) {
        delete this.roomsById[room.roomId];
        // remove from available rooms
        this.lockRoom(roomName, room);
    };
    return MatchMaker;
}());
exports.MatchMaker = MatchMaker;
