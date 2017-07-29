"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Utils_1 = require("./Utils");
class MatchMaker {
    constructor() {
        this.handlers = {};
        this.availableRooms = {};
        this.roomsById = {};
        this.roomCount = 0;
    }
    addHandler(name, handler, options = {}) {
        this.handlers[name] = [handler, options];
        this.availableRooms[name] = [];
    }
    hasHandler(roomName) {
        return this.handlers[roomName] !== undefined;
    }
    hasAvailableRoom(roomName) {
        return (this.availableRooms[roomName] &&
            this.availableRooms[roomName].length > 0);
    }
    getRoomById(roomId) {
        return this.roomsById[roomId];
    }
    joinById(client, roomId, clientOptions) {
        let room = this.roomsById[roomId];
        if (!room) {
            console.error(`Error: trying to join non-existant room "${roomId}"`);
        }
        else if (!room.requestJoin(clientOptions)) {
            console.error(`Error can't join "${clientOptions.roomName}" with options: ${JSON.stringify(clientOptions)}`);
            room = undefined;
        }
        return room;
    }
    joinOrCreateByName(client, roomName, clientOptions) {
        if (!this.hasHandler(roomName)) {
            console.error(`Error: no available handler for "${roomName}"`);
        }
        else {
            let room = this.requestJoin(client, roomName, clientOptions);
            if (room)
                return Promise.resolve(room);
            if (!room) {
                return this.create(client, roomName, clientOptions);
            }
        }
    }
    requestJoin(client, roomName, clientOptions) {
        let room;
        if (this.hasAvailableRoom(roomName)) {
            for (var i = 0; i < this.availableRooms[roomName].length; i++) {
                let availableRoom = this.availableRooms[roomName][i];
                if (availableRoom.requestJoin(clientOptions)) {
                    room = availableRoom;
                    break;
                }
            }
        }
        return room;
    }
    create(client, roomName, clientOptions) {
        let room = null, handler = this.handlers[roomName][0], options = this.handlers[roomName][1];
        // TODO:
        // keep track of available roomId's
        // try to use 0~127 in order to have lesser Buffer size
        options.roomId = this.roomCount++;
        options.roomName = roomName;
        room = new handler(Utils_1.merge(clientOptions, options));
        return room.onInit().then(() => {
            // ask client to join the room once initialized
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
        });
    }
    lockRoom(roomName, room) {
        if (this.hasAvailableRoom(roomName)) {
            let index = this.availableRooms[roomName].indexOf(room);
            if (index !== -1) {
                Utils_1.spliceOne(this.availableRooms[roomName], index);
            }
        }
    }
    unlockRoom(roomName, room) {
        if (this.availableRooms[roomName].indexOf(room) === -1) {
            this.availableRooms[roomName].push(room);
        }
    }
    disposeRoom(roomName, room) {
        delete this.roomsById[room.roomId];
        // remove from available rooms
        this.lockRoom(roomName, room);
    }
}
exports.MatchMaker = MatchMaker;
