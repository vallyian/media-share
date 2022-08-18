import cluster, { Worker } from "node:cluster";
import https from "node:https";

import { Application } from "express";

import { env } from "./env";
import { initApp } from "./app";
import * as processHelper from "./helpers/process.helper";
import * as fsService from "./services/fs.service";

serve(initApp).catch((err: Error) => processHelper.exit(processHelper.ExitCode.Generic, err));

function serve(expressAppFactory: () => Promise<Application>): Promise<void> {
    process.on("uncaughtException", err => processHelper.exit(processHelper.ExitCode.UncaughtException, err));
    process.on("unhandledRejection", (reason, promise) => processHelper.exit(processHelper.ExitCode.UnhandledRejection, reason, promise));

    return cluster.isPrimary
        ? clusterPrimary()
        : clusterWorker(expressAppFactory);
}

function clusterPrimary(): Promise<void> {
    return Promise.resolve()
        .then(() => {
            const { cert, key } = getCert();
            cert || console.warn("Warning", "no cert file found");
            key || console.warn("Warning", "no cert key file found");
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

function clusterWorker(expressAppFactory: () => Promise<Application>): Promise<void> {
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

function getCert(): { cert: Buffer | undefined, key: Buffer | undefined } {
    return {
        cert: fsService.tryReadFileSync(["certs/cert.crt", "/run/secrets/cert.crt"]),
        key: fsService.tryReadFileSync(["certs/cert.key", "/run/secrets/cert.key"])
    };
}
