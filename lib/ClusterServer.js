"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cluster = require("cluster");
var memshared = require("memshared");
var http = require("http");
var parseURL = require("url-parse");
var Master_1 = require("./cluster/Master");
var Worker_1 = require("./cluster/Worker");
var Protocol_1 = require("./Protocol");
var MatchMaker_1 = require("./MatchMaker");
var cache = memshared.store;
var ClusterServer = (function () {
    function ClusterServer(options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        if (cluster.isMaster) {
            Master_1.spawnWorkers(options);
            this.matchMakingWorker = Master_1.spawnMatchMaking();
            cache['matchmaking_process'] = this.matchMakingWorker.pid;
            this.server = options.server || http.createServer();
            this.server.on('connection', function (socket) {
                socket.pause();
            });
            this.server.on('request', function (request, response) {
                var socket = request.connection;
                var worker = Master_1.getNextWorkerForSocket(socket);
                var body = [];
                request.on('data', function (chunk) {
                    body.push(chunk);
                }).on('end', function () {
                    worker.send([Protocol_1.Protocol.PASS_HTTP_SOCKET, {
                            url: request.url,
                            headers: request.headers,
                            body: Buffer.concat(body).toString(),
                            method: request.method,
                        }], socket);
                });
            });
            this.server.on('upgrade', function (request, socket, head) {
                var worker = _this.matchMakingWorker;
                var roomId = parseURL(request.url).pathname.substr(1);
                // bind client to the worker that has the requested room spawed
                if (cache[roomId]) {
                    worker = memshared.getProcessById(cache[roomId]);
                }
                // send socket connection from master to a child process
                worker.send([Protocol_1.Protocol.PASS_WEBSOCKET, {
                        headers: request.headers,
                        method: request.method,
                    }, head, request.url], socket);
            });
        }
        if (cluster.isWorker) {
            this.matchMaker = new MatchMaker_1.MatchMaker();
        }
    }
    ClusterServer.prototype.listen = function (port, hostname, backlog, listeningListener) {
        if (cluster.isMaster) {
            this.server.listen(port, hostname, backlog, listeningListener);
        }
    };
    ClusterServer.prototype.register = function (name, handler, options) {
        if (options === void 0) { options = {}; }
        if (cluster.isMaster) {
            if (!cache['handlers']) {
                cache['handlers'] = [];
            }
            // push to available handlers list
            cache['handlers'].push(name);
        }
        else {
            // register session handler
            this.matchMaker.addHandler(name, handler, options);
        }
    };
    ClusterServer.prototype.attach = function (options) {
        if (!cluster.isWorker) {
            // ClusterServer#attach method should only be called from a worker process.
            return;
        }
        if (options.server) {
            // Don't expose internal server to the outside.
            this.server = Worker_1.setupWorker(options.server.listen(0, "localhost"), this.matchMaker);
        }
    };
    return ClusterServer;
}());
exports.ClusterServer = ClusterServer;
