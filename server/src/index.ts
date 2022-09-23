import cluster, { Worker } from "node:cluster";
import https from "node:https";
import { Application } from "express";
import * as config from "./config";
import initApp from "./app";
import googleIdTokenAdapter from "./adapters/g-id-token.adapter";
import cryptoAdapterInit from "./adapters/crypto.adapter";
import processHelper from "./helpers/process.helper";
import fsService from "./services/fs.service";

serve(() => initApp(infrastructure())).catch((err: Error) => processHelper.exit("Generic", err));

function infrastructure() {
    const cryptoAdapter = cryptoAdapterInit(config.default.TOKEN_KEY);
    const idTokenAdapters = {
        google: googleIdTokenAdapter(cryptoAdapter.sha256, config.default.AUTH_CLIENT)
    };

    config.init(() => cryptoAdapter.randomString(256));

    return { cryptoAdapter, idTokenAdapters };
}

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
    console.info(`${cert && key ? "[secure]" : "[insecure]"} ${config.default.NODE_ENV} server (main process ${process.pid}) starting on port ${config.default.PORT}`);

    const workers = new Array<Worker>();
    const fork = () => workers.push(cluster.fork(config));
    new Array(config.default.CLUSTES).fill(null).map(fork);
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
            server.listen(config.default.PORT, () => console.info(`service (worker process ${process.pid}) is online`));
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
