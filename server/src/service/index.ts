/* eslint-disable @typescript-eslint/require-await */
import cluster, { Worker } from "node:cluster";
import https from "node:https";
import { existsSync } from "node:fs";
import { Logger } from "../@types/Logger";
import { Terminator } from "../@types/Terminator";
import { App } from "./app";
import { Config } from "../config";
import { domain } from "../domain";

/* eslint-disable no-restricted-globals */
export function Service(
    config: Config,
    logger: Logger,
    terminator: Terminator,
    appDomain: ReturnType<typeof domain>
) {
    const app = App(logger, appDomain, config);

    return serve;

    function serve() {
        process.on("uncaughtException", err => terminator("UncaughtException", err));
        process.on("unhandledRejection", (reason, promise) => terminator("UnhandledRejection", reason, promise));

        return cluster.isPrimary
            ? clusterPrimary().catch((err: Error) => terminator("InitFunction", err))
            : clusterWorker().catch((err: Error) => terminator("WorkerStartup", err));
    }

    async function clusterPrimary() {
        if (!config.certCrt) logger.warn("no cert file found");
        if (!config.certKey) logger.warn("no cert key file found");
        if (!existsSync(config.mediaDir)) logger.warn("media dir not found");
        logger.info(config.certCrt && config.certKey ? "secure" : "insecure", config.NODE_ENV, "server started on ports", { web: config.webport, dav: config.davport });
        const workers = new Array<Worker>();
        const fork = () => workers.push(cluster.fork(config.clusterSharedEnv));
        new Array(config.clusters).fill(null).forEach(fork);
        cluster.on("exit", (worker, code, signal) => {
            const workerId = workers.findIndex(w => w.id === worker.id);
            if (workerId >= 0) workers.splice(workerId, 1);
            logger.error(`worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
            fork();
        });
    }

    async function clusterWorker() {
        (config.certCrt && config.certKey
            ? https.createServer({ cert: config.certCrt, key: config.certKey }, app.webApp)
            : app.webApp
        ).listen(config.webport, () => logger.info("web service worker is online"));
        (config.certCrt && config.certKey
            ? https.createServer({ cert: config.certCrt, key: config.certKey }, app.davApp)
            : app.davApp
        ).listen(config.davport, () => logger.info("dav service worker is online"));
    }
}
