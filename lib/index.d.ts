/// <reference types="uws" />
import * as WebSocket from "uws";
export { Server } from "./Server";
export { Room } from "./Room";
export { Protocol } from "./Protocol";
export declare type EntityMap<T> = {
    [entityId: string]: T;
};
export declare function generateId(): string;
export declare type Client = WebSocket & {
    id: string;
};
