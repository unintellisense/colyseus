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
var msgpack = require("msgpack-lite");
var fossilDelta = require("fossil-delta");
var clock_timer_js_1 = require("clock-timer.js");
var events_1 = require("events");
var timeframe_1 = require("timeframe");
var Protocol_1 = require("./Protocol");
var Utils_1 = require("./Utils");
var Room = (function (_super) {
    __extends(Room, _super);
    function Room(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this) || this;
        _this.clock = new clock_timer_js_1.default();
        _this.clients = [];
        _this._delayedMessage = [];
        _this.roomId = options.roomId;
        _this.roomName = options.roomName;
        _this.options = options;
        // Default patch rate is 20fps (50ms)
        _this.setPatchRate(1000 / 20);
        return _this;
    }
    Room.prototype.requestJoin = function (options) {
        return true;
    };
    Room.prototype.setSimulationInterval = function (callback, delay) {
        var _this = this;
        if (delay === void 0) { delay = 1000 / 60; }
        // clear previous interval in case called setSimulationInterval more than once
        if (this._simulationInterval)
            clearInterval(this._simulationInterval);
        this._simulationInterval = setInterval(function () {
            _this.clock.tick();
            callback();
        }, delay);
    };
    Room.prototype.setPatchRate = function (milliseconds) {
        // clear previous interval in case called setPatchRate more than once
        if (this._patchInterval)
            clearInterval(this._patchInterval);
        this._patchInterval = setInterval(this.broadcastPatch.bind(this), milliseconds);
    };
    Room.prototype.useTimeline = function (maxSnapshots) {
        if (maxSnapshots === void 0) { maxSnapshots = 10; }
        this.timeline = timeframe_1.createTimeline(maxSnapshots);
    };
    Room.prototype.setState = function (newState) {
        this.clock.start();
        // ensure state is populated for `sendState()` method.
        this._previousState = Utils_1.toJSON(newState);
        this._previousStateEncoded = msgpack.encode(this._previousState);
        this.state = newState;
        if (this.timeline) {
            this.timeline.takeSnapshot(this.state);
        }
    };
    Room.prototype.lock = function () {
        this.emit('lock');
    };
    Room.prototype.unlock = function () {
        this.emit('unlock');
    };
    Room.prototype.send = function (client, data, delay) {
        if (!delay) {
            return client.send(msgpack.encode([Protocol_1.Protocol.ROOM_DATA, this.roomId, data]), { binary: true }, Utils_1.logError.bind(this));
        }
        else {
            this._delayedMessage.push({ client: client, data: data });
        }
    };
    Room.prototype.broadcast = function (data) {
        // no data given, try to broadcast patched state
        if (!data) {
            throw new Error("Room#broadcast: 'data' is required to broadcast.");
        }
        // encode all messages with msgpack
        if (!(data instanceof Buffer)) {
            data = msgpack.encode([Protocol_1.Protocol.ROOM_DATA, this.roomId, data]);
        }
        var numClients = this.clients.length;
        while (numClients--) {
            this.clients[numClients].send(data, { binary: true }, Utils_1.logError.bind(this));
        }
        return true;
    };
    Room.prototype.disconnect = function () {
        var i = this.clients.length;
        while (i--) {
            this._onLeave(this.clients[i]);
        }
    };
    Room.prototype.sendState = function (client) {
        client.send(msgpack.encode([
            Protocol_1.Protocol.ROOM_STATE,
            this.roomId,
            this._previousState,
            this.clock.currentTime,
            this.clock.elapsedTime,
        ]), {
            binary: true
        }, Utils_1.logError.bind(this));
    };
    Room.prototype.broadcastPatch = function () {
        if (!this._previousState) {
            throw new Error('trying to broadcast null state. you should call #setState on constructor or during user connection.');
        }
        var currentState = Utils_1.toJSON(this.state);
        var currentStateEncoded = msgpack.encode(currentState);
        // skip if state has not changed.
        if (!currentStateEncoded.equals(this._previousStateEncoded)) {
            var patches = fossilDelta.create(this._previousStateEncoded, currentStateEncoded);
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
        // send any pending delayed messages
        for (var i = this._delayedMessage.length - 1; i >= 0; i--) {
            this.send(this._delayedMessage[i].client, this._delayedMessage[i].data);
        }
        // clear the pending message list
        this._delayedMessage.length = 0;
    };
    Room.prototype._onJoin = function (client, options) {
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
    };
    Room.prototype._onLeave = function (client, isDisconnect) {
        if (isDisconnect === void 0) { isDisconnect = false; }
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
    };
    return Room;
}(events_1.EventEmitter));
exports.Room = Room;
