import { Client } from "./index";
export declare enum Protocol {
    USER_ID = 1,
    PASS_HTTP_SOCKET = 3,
    PASS_WEBSOCKET = 4,
    REQUEST_JOIN_ROOM = 8,
    CREATE_ROOM = 9,
    JOIN_ROOM = 10,
    JOIN_ERROR = 11,
    LEAVE_ROOM = 12,
    ROOM_DATA = 13,
    ROOM_STATE = 14,
    ROOM_STATE_PATCH = 15,
    BAD_REQUEST = 50,
}
export declare function send(client: Client, message: any[]): void;
