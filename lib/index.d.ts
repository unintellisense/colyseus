/// <reference types="uws" />
import * as WebSocket from "uws";
export { Server } from "./Server";
export { ClusterServer } from "./ClusterServer";
export { Room } from "./Room";
export { Protocol } from "./Protocol";
export declare type EntityMap<T> = {
    [entityId: string]: T;
};
export { nonenumerable as nosync } from "nonenumerable";
export declare function generateId(): string;
export declare function isValidId(id: any): boolean;
export declare type Client = WebSocket & {
    id: string;
    sessionId: string;
};
