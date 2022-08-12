import cluster, { Worker } from "node:cluster";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

import { Application } from "express";

import { env } from "./env";
import { makeApp } from "./app";
import * as processHelper from "./helpers/process.helper";

serve(makeApp).catch((err: Error) => processHelper.exit(processHelper.ExitCode.Generic, "Critical", err));

function serve(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    process.on("uncaughtException", err => processHelper.exit(processHelper.ExitCode.UncaughtException, err));
    process.on("unhandledRejection", (reason, promise) => processHelper.exit(processHelper.ExitCode.UnhandledRejection, reason, promise));

    return cluster.isPrimary
        ? clusterPrimary()
        : clusterWorker(expressAppFactory);
}

function clusterPrimary(): Promise<void> {
    return Promise.resolve()
        .then(() => {
            const { cert, key, warns } = getCert();
            warns.forEach(warn => console.warn("Warning", warn));
            console.info(`${cert && key ? "[secure]" : "[insecure]"} ${env.NODE_ENV} server (main process ${process.pid}) starting on port ${env.PORT}`);
        })
        .then(() => {
            const workers = new Array<Worker>();
            const fork = () => workers.push(cluster.fork(env));
            new Array(env.CLUSTES).fill(null).map(fork);
            cluster.on("exit", (worker, code, signal) => {
                const workerId = workers.findIndex(w => w.id === worker.id);
                if (workerId >= 0) workers.splice(workerId, 1);
                console.error("Error", `worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
                fork();
            });
        });
}

function clusterWorker(expressAppFactory: () => Application | Promise<Application>): Promise<void> {
    return Promise.resolve()
        .then(() => expressAppFactory())
        .then(app => {
            const { cert, key } = getCert();
            const server = cert && key
                ? https.createServer({ cert, key }, app)
                : app;
            server.listen(env.PORT, () => console.info(`service (worker process ${process.pid}) is online`));
        })
        .catch(err => {
            console.error("Critical", err);
            processHelper.exit(processHelper.ExitCode.WorkerStartup);
        });
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
