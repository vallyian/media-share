import cluster, { Worker } from "node:cluster";
import https from "node:https";
import { Application } from "express";
import env from "./env";
import app from "./app";
import processHelper from "./helpers/process.helper";
import fsService from "./services/fs.service";

serve(app.initApp).catch((err: Error) => processHelper.exit("Generic", err));

async function serve(expressAppFactory: () => Promise<Application>) {
    process.on("uncaughtException", err => processHelper.exit("UncaughtException", err));
    process.on("unhandledRejection", (reason, promise) => processHelper.exit("UnhandledRejection", reason, promise));

    if (cluster.isPrimary)
        clusterPrimary();
    else
        await clusterWorker(expressAppFactory);
}

function clusterPrimary() {
    const { cert, key } = getCert();
    cert || console.warn("Warning", "no cert file found");
    key || console.warn("Warning", "no cert key file found");
    console.info(`${cert && key ? "[secure]" : "[insecure]"} ${env.NODE_ENV} server (main process ${process.pid}) starting on port ${env.PORT}`);

    const workers = new Array<Worker>();
    const fork = () => workers.push(cluster.fork(env));
    new Array(env.CLUSTES).fill(null).map(fork);
    cluster.on("exit", (worker, code, signal) => {
        const workerId = workers.findIndex(w => w.id === worker.id);
        if (workerId >= 0) workers.splice(workerId, 1);
        console.error("Error", `worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
        fork();
    });
}

function clusterWorker(expressAppFactory: () => Promise<Application>) {
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
            processHelper.exit("WorkerStartup");
        });
}

function getCert(): { cert: Buffer | undefined, key: Buffer | undefined } {
    return {
        cert: fsService.readFileSync(["certs/cert.crt", "/run/secrets/cert.crt"]),
        key: fsService.readFileSync(["certs/cert.key", "/run/secrets/cert.key"])
    };
}
