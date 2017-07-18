import { Client, Room } from "./index";
export declare type ClientOptions = {
    clientId: string;
} & any;
export interface RoomWithScore {
    room: Room;
    score: number;
}
export declare class MatchMaker {
    private handlers;
    private availableRooms;
    private roomsById;
    private roomCount;
    protected sessions: {
        [sessionId: string]: Room;
    };
    protected connectingClientByRoom: {
        [roomId: string]: {
            [clientId: string]: any;
        };
    };
    execute(client: Client, message: any): void;
    /**
     * Create/joins a particular client in a room running in a worker process.
     *
     * The client doesn't join instantly because this method is called from the
     * match-making process. The client will request a new WebSocket connection
     * to effectively join into the room created/joined by this method.
     */
    onJoinRoomRequest(roomToJoin: string, clientOptions: ClientOptions, allowCreateRoom: boolean, callback: (err: string, room: Room) => any): void;
    /**
     * Binds target client to the room running in a worker process.
     */
    onJoin(roomId: string, client: Client, callback: (err: string, room: Room) => any): void;
    onLeave(client: Client, room: Room): void;
    private onClientLeaveRoom;
    addHandler(name: string, handler: Function, options?: any): void;
    protected hasHandler(name: string): boolean;
    hasAvailableRoom(roomName: string): boolean;
    getRoomById(roomId: number): Room;
    joinById(roomId: string, clientOptions: ClientOptions): Room;
    requestToJoinRoom(roomName: string, clientOptions: ClientOptions): RoomWithScore;
    create(roomName: string, clientOptions: ClientOptions): Room;
    private lockRoom(roomName, room);
    private unlockRoom(roomName, room);
    private disposeRoom(roomName, room);
}
