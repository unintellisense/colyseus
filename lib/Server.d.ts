/// <reference types="uws" />
/// <reference types="node" />
import * as http from "http";
import { IServerOptions } from "uws";
import { ClusterServer } from "./ClusterServer";
export declare class Server {
    protected clusterServer: ClusterServer;
    constructor(options?: IServerOptions);
    attach(options: {
        server: http.Server;
    }): void;
    listen(port: number, hostname?: string, backlog?: number, listeningListener?: Function): void;
    register(name: string, handler: Function, options?: any): void;
}
