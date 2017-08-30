import { Room } from "./Room";
import { Client } from "./index";
export declare class MatchMaker {
    private handlers;
    private availableRooms;
    private roomsById;
    private roomCount;
    addHandler(name: string, handler: Function, options?: any): void;
    hasHandler(roomName: string): boolean;
    hasAvailableRoom(roomName: string): boolean;
    getRoomById(roomId: number): Room<any>;
    joinById(client: Client, roomId: number, clientOptions?: any): Room<any>;
    joinOrCreateByName(client: Client, roomName: string, clientOptions: any): Promise<Room<any>>;
    requestJoin(client: Client, roomName: string, clientOptions: any): Room<any>;
    create(client: Client, roomName: string, clientOptions: any): Promise<Room<any>>;
    private lockRoom(roomName, room);
    private unlockRoom(roomName, room);
    private disposeRoom(roomName, room);
}
