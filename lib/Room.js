"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const msgpack = require("msgpack-lite");
const fossilDelta = require("fossil-delta");
const clock_timer_js_1 = require("clock-timer.js");
const events_1 = require("events");
const timeframe_1 = require("timeframe");
const Protocol_1 = require("./Protocol");
const Utils_1 = require("./Utils");
class Room extends events_1.EventEmitter {
    constructor(options = {}) {
        super();
        this.clock = new clock_timer_js_1.default();
        this.clients = [];
        this._delayedMessage = [];
        this._delayedBroadCast = [];
        this.roomId = options.roomId;
        this.roomName = options.roomName;
        this.options = options;
        // Default patch rate is 20fps (50ms)
        this.setPatchRate(1000 / 20);
    }
    requestJoin(options) {
        return true;
    }
    setSimulationInterval(callback, delay = 1000 / 60) {
        // clear previous interval in case called setSimulationInterval more than once
        if (this._simulationInterval)
            clearInterval(this._simulationInterval);
        this._simulationInterval = setInterval(() => {
            this.clock.tick();
            callback();
        }, delay);
    }
    setPatchRate(milliseconds) {
        // clear previous interval in case called setPatchRate more than once
        if (this._patchInterval)
            clearInterval(this._patchInterval);
        this._patchInterval = setInterval(this.broadcastPatch.bind(this), milliseconds);
    }
    useTimeline(maxSnapshots = 10) {
        this.timeline = timeframe_1.createTimeline(maxSnapshots);
    }
    setState(newState) {
        this.clock.start();
        // ensure state is populated for `sendState()` method.
        this._previousState = Utils_1.toJSON(newState);
        this._previousStateEncoded = msgpack.encode(this._previousState);
        this.state = newState;
        if (this.timeline) {
            this.timeline.takeSnapshot(this.state);
        }
    }
    lock() {
        this.emit('lock');
    }
    unlock() {
        this.emit('unlock');
    }
    send(client, data, delay) {
        if (!delay) {
            return client.send(msgpack.encode([Protocol_1.Protocol.ROOM_DATA, this.roomId, data]), { binary: true }, Utils_1.logError.bind(this));
        }
        else {
            this._delayedMessage.push({ client: client, data: data });
        }
    }
    broadcast(data, delay) {
        // encode all messages with msgpack
        if (!(data instanceof Buffer)) {
            data = msgpack.encode([Protocol_1.Protocol.ROOM_DATA, this.roomId, data]);
        }
        if (!delay) {
            var numClients = this.clients.length;
            while (numClients--) {
                this.clients[numClients].send(data, { binary: true }, Utils_1.logError.bind(this));
            }
        }
        else {
            this._delayedBroadCast.push(data);
        }
        return true;
    }
    disconnect() {
        var i = this.clients.length;
        while (i--) {
            this._onLeave(this.clients[i]);
        }
    }
    sendState(client) {
        client.send(msgpack.encode([
            Protocol_1.Protocol.ROOM_STATE,
            this.roomId,
            this._previousState,
            this.clock.currentTime,
            this.clock.elapsedTime,
        ]), {
            binary: true
        }, Utils_1.logError.bind(this));
    }
    broadcastPatch() {
        if (!this._previousState) {
            throw new Error('trying to broadcast null state. you should call #setState on constructor or during user connection.');
        }
        let currentState = Utils_1.toJSON(this.state);
        let currentStateEncoded = msgpack.encode(currentState);
        // skip if state has not changed.
        if (!currentStateEncoded.equals(this._previousStateEncoded)) {
            let patches = fossilDelta.create(this._previousStateEncoded, currentStateEncoded);
            // take a snapshot of the current state
            if (this.timeline) {
                this.timeline.takeSnapshot(this.state, this.clock.elapsedTime);
            }
            this._previousState = currentState;
            this._previousStateEncoded = currentStateEncoded;
            // broadcast patches (diff state) to all clients,
            // even if nothing has changed in order to calculate PING on client-side
            this.broadcast(msgpack.encode([Protocol_1.Protocol.ROOM_STATE_PATCH, this.roomId, patches]));
        }
        // broadcast any delayed broadcasts
        if (this._delayedBroadCast.length) {
            var numClients = this.clients.length;
            while (numClients--) {
                let numMessages = this._delayedBroadCast.length;
                while (numMessages--) {
                    this.clients[numClients].send(this._delayedBroadCast[numMessages], { binary: true }, Utils_1.logError.bind(this));
                }
            }
            this._delayedBroadCast.length = 0;
        }
        // send any pending delayed messages
        for (let i = this._delayedMessage.length - 1; i >= 0; i--) {
            this.send(this._delayedMessage[i].client, this._delayedMessage[i].data);
        }
        // clear the pending message list
        this._delayedMessage.length = 0;
    }
    _onJoin(client, options) {
        this.clients.push(client);
        // confirm room id that matches the room name requested to join
        client.send(msgpack.encode([Protocol_1.Protocol.JOIN_ROOM, this.roomId, this.roomName]), { binary: true }, Utils_1.logError.bind(this));
        // send current state when new client joins the room
        if (this.state) {
            this.sendState(client);
        }
        if (this.onJoin) {
            this.onJoin(client, options);
        }
    }
    _onLeave(client, isDisconnect = false) {
        // remove client from client list
        Utils_1.spliceOne(this.clients, this.clients.indexOf(client));
        if (this.onLeave)
            this.onLeave(client);
        this.emit('leave', client, isDisconnect);
        if (!isDisconnect) {
            client.send(msgpack.encode([Protocol_1.Protocol.LEAVE_ROOM, this.roomId]), { binary: true }, Utils_1.logError.bind(this));
        }
        // custom cleanup method & clear intervals
        if (this.clients.length == 0) {
            if (this.onDispose)
                this.onDispose();
            if (this._patchInterval)
                clearInterval(this._patchInterval);
            if (this._simulationInterval)
                clearInterval(this._simulationInterval);
            this.emit('dispose');
        }
    }
}
exports.Room = Room;
