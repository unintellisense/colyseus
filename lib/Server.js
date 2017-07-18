"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ClusterServer_1 = require("./ClusterServer");
var Server = (function () {
    function Server(options) {
        this.clusterServer = new ClusterServer_1.ClusterServer();
        if (options.server) {
            this.attach({ server: options.server });
        }
    }
    Server.prototype.attach = function (options) {
        this.clusterServer.attach(options);
    };
    Server.prototype.listen = function (port, hostname, backlog, listeningListener) {
        this.clusterServer.listen(port, hostname, backlog, listeningListener);
    };
    Server.prototype.register = function (name, handler, options) {
        if (options === void 0) { options = {}; }
        this.clusterServer.register(name, handler, options);
    };
    return Server;
}());
exports.Server = Server;
