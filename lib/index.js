"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shortid = require("shortid");
// Core classes
var Server_1 = require("./Server");
exports.Server = Server_1.Server;
var Room_1 = require("./Room");
exports.Room = Room_1.Room;
var Protocol_1 = require("./Protocol");
exports.Protocol = Protocol_1.Protocol;
function generateId() { return shortid.generate(); }
exports.generateId = generateId;
