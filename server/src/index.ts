import cluster from "node:cluster";
import os from "node:os";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

import { Application } from "express";

import { globals, processExit } from "./globals";
import { env } from "./env";
import { makeApp } from "./app";

serve(makeApp).catch((err: Error) => processExit(ExitCode.Generic, "Critical", err));

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
    globals.process.on("uncaughtException", err => processExit(ExitCode.UncaughtException, err));
    globals.process.on("unhandledRejection", (reason, promise) => processExit(ExitCode.UnhandledRejection, reason, promise));

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
        || processExit(ExitCode.Environment, "env NODE_ENV invalid");
    env.PORT > 0 && env.PORT <= 65536
        || processExit(ExitCode.Environment, "env PORT invalid");
    env.CLUSTERS > 0 && env.CLUSTERS <= os.cpus().length
        || processExit(ExitCode.Environment, "env CLUSTERS invalid");
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

    server.listen(env.PORT, "127.0.0.1", () => globals.console.info(`service (worker process ${globals.process.pid}) is online`));
}

function getCert(): { cert: Buffer | undefined, key: Buffer | undefined, warns: string[] } {
    let [cert, key,] = [<Buffer | undefined>undefined, <Buffer | undefined>undefined];
    const warns = [];

    const crtPath = env.NODE_ENV === "development"
        ? path.join("certs", "cert.crt")
        : "/run/secrets/cert.crt";
    fs.existsSync(crtPath) && fs.statSync(crtPath).isFile()
        ? cert = fs.readFileSync(crtPath)
        : warns.push(`cert file "${crtPath}" not found`);

    const keyPath = env.NODE_ENV === "development"
        ? path.join("certs", "cert.key")
        : "/run/secrets/cert.key";
    fs.existsSync(keyPath) && fs.statSync(keyPath).isFile()
        ? key = fs.readFileSync(keyPath)
        : warns.push(`cert key file "${keyPath}" not found`);

    return { cert, key, warns };
}
