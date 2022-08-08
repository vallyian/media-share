import cluster from "node:cluster";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

import { Application } from "express";

import * as process from "./internals/process";
import { env } from "./env";
import { makeApp } from "./app";

serve(makeApp).catch((err: Error) => process.exit(process.ExitCode.Generic, "Critical", err));

function serve(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    process.on("uncaughtException", err => process.exit(process.ExitCode.UncaughtException, err));
    process.on("unhandledRejection", (reason, promise) => process.exit(process.ExitCode.UnhandledRejection, reason, promise));

    return cluster.isPrimary
        ? clusterPrimary()
        : clusterWorker(expressAppFactory);
}

function clusterPrimary(): Promise<void> {
    return Promise.resolve()
        .then(() => getCert())
        .then(({ cert, key, warns }) => {
            warns.forEach(warn => console.warn("Warning", warn));
            console.info(`${cert && key ? "[secure]" : "[insecure]"} ${env.NODE_ENV} server (main process ${process.pid}) starting on port ${env.PORT}`);
        })
        .then(() => startWorkers());
}

function startWorkers(): void {
    new Array(env.CLUSTERS).fill(null).forEach(() => cluster.fork(env));
    cluster.on("exit", (worker, code, signal) => {
        console.error("Error", `worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
        cluster.fork();
    });
}

function clusterWorker(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    return Promise.resolve()
        .then(() => expressAppFactory())
        .then(app => starListen(app))
        .catch(err => {
            console.error("Critical", err);
            process.exit(process.ExitCode.WorkerStartup);
        });
}

function starListen(app: Application) {
    const { cert, key } = getCert();

    const server = cert && key
        ? https.createServer({ cert, key }, app)
        : app;

    server.listen(env.PORT, () => console.info(`service (worker process ${process.pid}) is online`));
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
