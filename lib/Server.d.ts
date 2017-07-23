/// <reference types="uws" />
/// <reference types="node" />
import { EventEmitter } from "events";
import { Server as WebSocketServer, IServerOptions } from "uws";
import { MatchMaker } from "./MatchMaker";
import { Room } from "./Room";
export declare type ServerOptions = IServerOptions & {
    ws?: WebSocketServer;
};
export declare class Server extends EventEmitter {
    protected server: WebSocketServer;
    protected matchMaker: MatchMaker;
    protected clients: {
        [id: string]: Room<any>[];
    };
    constructor(options?: ServerOptions);
    /**
     * Attaches Colyseus server to a server or port.
     */
    attach(options: ServerOptions): void;
    /**
     * @example Registering with room name + class handler
     *    server.register("room_name", RoomHandler)
     *
     * @example Registering with room name + class handler + custom options
     *    server.register("area_1", AreaHandler, { map_file: "area1.json" })
     *    server.register("area_2", AreaHandler, { map_file: "area2.json" })
     *    server.register("area_3", AreaHandler, { map_file: "area3.json" })
     */
    register(name: string, handler: Function, options?: any): void;
    private onConnect;
    private onError(client, e);
    private onMessage(client, data);
    private onJoinRoomRequest(client, roomToJoin, clientOptions, callback);
    private onClientLeaveRoom;
    private onDisconnect(client);
}
