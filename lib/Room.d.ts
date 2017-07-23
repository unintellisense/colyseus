/// <reference types="node" />
import ClockTimer from "clock-timer.js";
import { EventEmitter } from "events";
import { Timeline } from "timeframe";
import { Client } from "./index";
export declare abstract class Room<T> extends EventEmitter {
    clock: ClockTimer;
    timeline?: Timeline;
    roomId: number;
    roomName: string;
    clients: Client[];
    options: any;
    state: T;
    protected _previousState: any;
    protected _previousStateEncoded: any;
    private _simulationInterval;
    private _patchInterval;
    private _delayedMessage;
    constructor(options?: any);
    abstract onMessage(client: Client, data: any): void;
    abstract onJoin(client: Client, options?: any): void;
    abstract onLeave(client: Client): void;
    abstract onDispose(): void;
    requestJoin(options: any): boolean;
    setSimulationInterval(callback: Function, delay?: number): void;
    setPatchRate(milliseconds: number): void;
    useTimeline(maxSnapshots?: number): void;
    setState(newState: any): void;
    lock(): void;
    unlock(): void;
    send(client: Client, data: any, delay?: boolean): void;
    broadcast(data: any): boolean;
    disconnect(): void;
    protected sendState(client: Client): void;
    private broadcastPatch();
    private _onJoin(client, options?);
    private _onLeave(client, isDisconnect?);
}
