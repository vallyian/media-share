import os from "node:os";
import fs from "node:fs";
import { Domain } from "./domain";
import { GoogleIdTokenAdapter } from "./adapters/google-id-token.adapter";
import { NodeCryptoAdapter } from "./adapters/node-crypto.adapter";
import { NodeFsAdapter } from "./adapters/node-fs.adapter";
import { Service } from "./service";
import { Config } from "./config";
import { TextEncodingAdapter } from "./adapters/text-encoding.adapter";
import { VideoProcessorAdapter } from "./adapters/video-processor.adapter";
import { ConsoleWriterAdapter } from "./adapters/console-writer.adapter";

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

    const terminator = (() => {
        const ExitCode = {
            Generic: 1,
            UncaughtException: 2,
            UnhandledRejection: 3,
            Config: 4,
            /* primary */
            InitFunction: 102,
            /* workers */
            WorkerStartup: 201,
        };
        return (code: keyof typeof ExitCode, ...error: unknown[]): never => {
            if (error) logger.error("Critical", ...error);
            // eslint-disable-next-line no-restricted-syntax
            process.exit(ExitCode[code]);
        };
    })();

    const config = new Config(
        process.env,
        (key: string) => terminator("Config", `config key ${key} invalid`),
        () => os.cpus().length
    );

    const certificate = (() => {
        const readFileSync = (filePath: string) => fs.statSync(filePath).isFile() ? fs.readFileSync(filePath) : undefined;
        return {
            cert: readFileSync("certs/cert.crt") || readFileSync("/run/secrets/cert.crt"),
            key: readFileSync("certs/cert.key") || readFileSync("/run/secrets/cert.key")
        };
    })();

    const domain = (() => {
        const logWriterAdapter = new ConsoleWriterAdapter();
        const cryptoAdapter = new NodeCryptoAdapter(config.tokenKey);
        const idTokenAdapters = {
            google: new GoogleIdTokenAdapter(cryptoAdapter.sha256, config.authClient)
        };
        const mediaStorageAdapter = new NodeFsAdapter();
        const textEncodingAdapter = new TextEncodingAdapter();
        const videoProcessorAdapter = new VideoProcessorAdapter();
        return new Domain(logWriterAdapter, idTokenAdapters, cryptoAdapter, mediaStorageAdapter, textEncodingAdapter, videoProcessorAdapter, config);
    })();

    return { logger, terminator, config, certificate, domain };
}
