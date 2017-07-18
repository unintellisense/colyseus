/// <reference types="node" />
import * as cluster from "cluster";
import * as child_process from "child_process";
import * as net from "net";
import { ClusterOptions } from "../ClusterServer";
export declare function getNextWorkerForSocket(socket: net.Socket): any;
export declare function spawnWorkers(options?: ClusterOptions): void;
export declare function spawnMatchMaking(): child_process.ChildProcess;
export declare function spawnWorker(): cluster.Worker;
