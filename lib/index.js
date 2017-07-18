"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var shortid = require("shortid");
// Core classes
var Server_1 = require("./Server");
exports.Server = Server_1.Server;
var ClusterServer_1 = require("./ClusterServer");
exports.ClusterServer = ClusterServer_1.ClusterServer;
var Room_1 = require("./Room");
exports.Room = Room_1.Room;
var Protocol_1 = require("./Protocol");
exports.Protocol = Protocol_1.Protocol;
// Utilities
var nonenumerable_1 = require("nonenumerable");
exports.nosync = nonenumerable_1.nonenumerable;
function generateId() { return shortid.generate(); }
exports.generateId = generateId;
function isValidId(id) { return shortid.isValid(id); }
exports.isValidId = isValidId;
