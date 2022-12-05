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

/* eslint-disable no-restricted-globals */
if (require.main === module) {
    // called from CLI; exec runner
    setEnv();
    const runner = runnerFactory();
    void runner();
} else {
    // imported as module; export runner
    module.exports = runnerFactory;
}

function setEnv() {
    (fs.existsSync(".env") ? fs.readFileSync(".env", "utf-8") : "").split("\n").forEach(l => {
        l = l.trim().replace(/^#+/, "").trim();
        if (!l || !l.includes("=")) return;

        const [k, vtmp] = l.split("=").map(s => s.trim());
        const v = vtmp?.replace(/(^["']|["']$)/g, "").trim();
        if (!k || !v) return;

        process.env[k] = v;
    });
}

function runnerFactory() {
    const { logger, terminator, config, domain } = infrastructure();
    const service = Service(logger, terminator, config, domain);
    return () => service().catch(err => terminator("Generic", err));
}

function infrastructure() {
    const logStream = fs.createWriteStream((d => `${d.getFullYear()}_${d.getMonth()}_${d.getDate()}.log`)(new Date()), { encoding: "utf-8", flags: "a" });
    const streamWriter = (consoler: (message?: unknown, ...optionalParams: unknown[]) => void) => (message?: unknown, ...optionalParams: unknown[]) => {
        consoler(message, ...optionalParams);
        logStream.write(JSON.stringify({ dt: new Date(), pid: process.pid, message, params: optionalParams.length ? optionalParams : undefined }) + "\n");
    };
    const logger = Object.freeze({
        info: streamWriter(console.info),
        warn: streamWriter(console.warn),
        error: streamWriter(console.error)
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
        InitFunction: 101,
        /* workers */
        WorkerStartup: 201,
    });

    const config = Config(
        process.env,
        (key: string) => terminator("Config", `config key ${key} invalid`),
        (length: number) => crypto.randomBytes(length).toString("base64"),
        () => os.cpus().length,
        (path: string) => path && fs.existsSync(path) && fs.statSync(path).isFile() ? fs.readFileSync(path, "utf-8") : undefined
    );

    const domain = new Domain(
        logger,
        { google: new GoogleIdTokenAdapter(config.authClient) },
        new NodeCryptoAdapter(config.tokenKey),
        new NodeFsAdapter(),
        new TextEncodingAdapter(),
        new VideoProcessorAdapter(),
        config
    );

    return { logger, terminator, config, domain };
}
