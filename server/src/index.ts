import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { Domain } from "./domain";
import { GoogleIdTokenAdapter } from "./adapters/google-id-token.adapter";
import { NodeCryptoAdapter } from "./adapters/node-crypto.adapter";
import { NodeFsAdapter } from "./adapters/node-fs.adapter";
import { Service } from "./service";
import { Config } from "./config";
import { TextEncodingAdapter } from "./adapters/text-encoding.adapter";
import { VideoProcessorAdapter } from "./adapters/video-processor.adapter";
import { ConsoleWriterAdapter } from "./adapters/console-writer.adapter";

/* eslint-disable no-restricted-globals */
if (require.main === module) {
    // called from CLI; exec runner
    const runner = runnerFactory();
    void runner();
} else {
    // imported as module; export runner
    module.exports = runnerFactory;
}

function runnerFactory() {
    const { logger, terminator, config, certificate, domain } = infrastructure();
    const service = new Service(logger, terminator, config, certificate, domain);
    return () => service.serve().catch(err => terminator("Generic", err));
}

function infrastructure() {
    const logger = Object.freeze({
        info: console.info,
        warn: console.warn,
        error: console.error
    });

    const terminator = (codes => (code: keyof typeof codes, ...error: unknown[]): never => {
        if (error) logger.error("Critical", ...error);
        // eslint-disable-next-line no-restricted-syntax
        process.exit(codes[code]);
    })({
        Generic: 1,
        UncaughtException: 2,
        UnhandledRejection: 3,
        Config: 4,
        /* primary */
        InitFunction: 102,
        /* workers */
        WorkerStartup: 201,
    });

    const config = new Config(
        process.env,
        (key: string) => terminator("Config", `config key ${key} invalid`),
        (length: number) => crypto.randomBytes(length).toString("base64"),
        () => os.cpus().length
    );

    const certificate = (file => ({
        cert: file("certs/cert.crt") || file("/run/secrets/cert.crt"),
        key: file("certs/cert.key") || file("/run/secrets/cert.key")
    }))((path: string) => fs.statSync(path).isFile() ? fs.readFileSync(path) : undefined);

    const domain = new Domain(
        new ConsoleWriterAdapter(),
        { google: new GoogleIdTokenAdapter(config.authClient) },
        new NodeCryptoAdapter(config.tokenKey),
        new NodeFsAdapter(),
        new TextEncodingAdapter(),
        new VideoProcessorAdapter(),
        config
    );

    return { logger, terminator, config, certificate, domain };
}
