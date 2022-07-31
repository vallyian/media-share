import assert from "node:assert";
import cluster from "node:cluster";
import os from "node:os";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

import { Application } from "express";

import { globals } from "./globals";
import { env } from "./env";
import { makeApp } from "./app";

serve(makeApp).catch((err: Error) => {
    globals.console.error("Critical", err);
    globals.process.exit(err.status || ExitCode.Generic);
});

enum ExitCode {
    Generic = 1,
    UncaughtException = 2,
    UnhandledRejection = 3,
    /* primary */
    Environment = 101,
    InitFunction = 102,
    /* workers */
    WorkerStartup = 201,
}

function serve(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    globals.process.on("uncaughtException", err => assert.fail({ ...err, status: ExitCode.UncaughtException }));
    globals.process.on("unhandledRejection", (reason, promise) => assert.fail({ ...Error(String(reason)), promise, status: ExitCode.UnhandledRejection }));

    return cluster.isPrimary
        ? clusterPrimary()
        : clusterWorker(expressAppFactory);
}

function clusterPrimary(): Promise<void> {
    return Promise.resolve()
        .then(() => validateMasterEnv())
        .then(() => getCert())
        .then(({ cert, key, warns }) => {
            warns.forEach(warn => globals.console.warn("Warning", warn));
            globals.console.info(`${cert && key ? "[secure]" : "[insecure]"} ${env.NODE_ENV} server (main process ${globals.process.pid}) starting on port ${env.PORT}`);
        })
        .then(() => startWorkers());
}

function validateMasterEnv(): void {
    env.NODE_ENV
        || assert.fail({ ...Error("env NODE_ENV invalid"), status: ExitCode.Environment });
    env.PORT > 0 && env.PORT <= 65536
        || assert.fail({ ...Error("env PORT invalid"), status: ExitCode.Environment });
    env.CLUSTERS > 0 && env.CLUSTERS <= os.cpus().length
        || assert.fail({ ...Error("env CLUSTERS invalid"), status: ExitCode.Environment });
}

function startWorkers(): void {
    new Array(env.CLUSTERS).fill(null).forEach(() => cluster.fork(env));
    cluster.on("exit", (worker, code, signal) => {
        globals.console.error("Error", `worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
        cluster.fork();
    });
}

function clusterWorker(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    return Promise.resolve()
        .then(() => expressAppFactory())
        .then(app => starListen(app))
        .catch(err => {
            globals.console.error("Critical", err);
            globals.process.exit(ExitCode.WorkerStartup);
        });
}

function starListen(app: Application) {
    const { cert, key } = getCert();

    const server = cert && key
        ? https.createServer({ cert, key }, app)
        : app;

    server.listen(env.PORT, () => globals.console.info(`service (worker process ${globals.process.pid}) is online`));
}

function getCert(): { cert?: Buffer, key?: Buffer, warns: string[] } {
    let [cert, key,] = [undefined, undefined];
    const warns = [];

    const crtPath = path.normalize(env.CERT_CRT);
    fs.existsSync(crtPath) && fs.statSync(crtPath).isFile()
        ? cert = fs.readFileSync(crtPath)
        : warns.push(`cert file "${crtPath}" not found`);

    const keyPath = path.normalize(env.CERT_KEY);
    fs.existsSync(keyPath) && fs.statSync(keyPath).isFile()
        ? key = fs.readFileSync(keyPath)
        : warns.push(`cert key file "${keyPath}" not found`);

    return { cert, key, warns };
}
