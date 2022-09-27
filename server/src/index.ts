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

if (require.main === module) {
    // called from CLI; exec runner
    const runner = runnerFactory();
    void runner();
} else {
    // imported as module; export runner
    module.exports = runnerFactory;
}

function runnerFactory() {
    const { config, logger, domain, certificate, terminator } = infrastructure();
    const service = new Service(config, logger, domain, certificate, terminator);
    return () => service.serve().catch(err => terminator("Generic", err));
}

function infrastructure() {
    // terminator
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
    const terminator = (code: keyof typeof ExitCode, ...error: unknown[]): never => {
        if (error) console.error("Critical", ...error);
        // eslint-disable-next-line no-restricted-syntax
        process.exit(ExitCode[code]);
    };

    // config
    const config = new Config(
        process.env,
        (key: string) => terminator("Config", `config key ${key} invalid`),
        () => os.cpus().length
    );

    // logger
    const logger = {
        info: console.info,
        warn: console.warn,
        error: console.error
    };

    // certs
    const readFileSync = (filePaths: string[]) => {
        for (const filePath of filePaths)
            if (fs.statSync(filePath).isFile())
                return fs.readFileSync(filePath);
        return;
    };
    const certificate = {
        cert: readFileSync(["certs/cert.crt", "/run/secrets/cert.crt"]),
        key: readFileSync(["certs/cert.key", "/run/secrets/cert.key"])
    };

    // domain
    const cryptoAdapter = new NodeCryptoAdapter(config.tokenKey);
    const idTokenAdapters = {
        google: new GoogleIdTokenAdapter(cryptoAdapter.sha256, config.authClient)
    };
    const mediaStorageAdapter = new NodeFsAdapter();
    const textEncodingAdapter = new TextEncodingAdapter();
    const videoProcessorAdapter = new VideoProcessorAdapter();
    const domain = new Domain(idTokenAdapters, cryptoAdapter, mediaStorageAdapter, textEncodingAdapter, videoProcessorAdapter, config);

    return { config, logger, domain, certificate, terminator };
}
