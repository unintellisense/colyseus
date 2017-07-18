/// <reference types="node" />
import * as child_process from "child_process";
import * as net from "net";
import * as http from "http";
import { MatchMaker } from "./MatchMaker";
export interface ClusterOptions {
    server?: http.Server;
    numWorkers?: number;
}
export declare class ClusterServer {
    protected server: net.Server | http.Server;
    protected matchMakingWorker: child_process.ChildProcess;
    protected matchMaker: MatchMaker;
    constructor(options?: ClusterOptions);
    listen(port: number, hostname?: string, backlog?: number, listeningListener?: Function): void;
    register(name: string, handler: Function, options?: any): void;
    attach(options: {
        server: http.Server;
    }): void;
}
