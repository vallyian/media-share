import cluster, { Worker } from "node:cluster";
import https from "node:https";
import { Certificate } from "../@types/Certificate";
import { Logger } from "../@types/Logger";
import { Terminator } from "../@types/Terminator";
import { App } from "./app";
import { Config } from "../config";
import { Domain } from "../domain";

/* eslint-disable no-restricted-globals */
export class Service {
    private readonly app: App;

    constructor(
        private readonly logger: Logger,
        private readonly terminator: Terminator,
        private readonly config: Config,
        private readonly certificate: Certificate,
        private readonly domain: Domain
    ) {
        this.app = new App(this.logger, this.domain, this.config);
    }

    serve(): Promise<void> {
        process.on("uncaughtException", err => this.terminator("UncaughtException", err));
        process.on("unhandledRejection", (reason, promise) => this.terminator("UnhandledRejection", reason, promise));

        return cluster.isPrimary
            ? this.clusterPrimary().catch((err: Error) => this.terminator("InitFunction", err))
            : this.clusterWorker().catch((err: Error) => this.terminator("WorkerStartup", err));
    }

    private async clusterPrimary() {
        const { cert, key } = this.certificate;
        cert || this.logger.warn("no cert file found");
        key || this.logger.warn("no cert key file found");
        this.logger.info(`${cert && key ? "[secure]" : "[insecure]"} ${this.config.NODE_ENV} server (main process ${process.pid}) starting on port ${this.config.port}`);

        const workers = new Array<Worker>();
        const fork = () => workers.push(cluster.fork(this.config));
        new Array(this.config.clusters).fill(null).map(fork);
        cluster.on("exit", (worker, code, signal) => {
            const workerId = workers.findIndex(w => w.id === worker.id);
            if (workerId >= 0) workers.splice(workerId, 1);
            this.logger.error(`worker ${worker.process.pid} exited; ${JSON.stringify({ code, signal })}`);
            fork();
        });
    }

    private async clusterWorker() {
        const { cert, key } = this.certificate;
        const server = cert && key
            ? https.createServer({ cert, key }, this.app.app)
            : this.app.app;
        server.listen(this.config.port, () => this.logger.info(`service (worker process ${process.pid}) is online`));
    }
}