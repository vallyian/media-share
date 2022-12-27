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
import { isRight, isLeft } from "fp-ts/lib/Either";

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
    const service = Service(config, logger, terminator, domain);
    return () => service().catch(err => terminator("Generic", err));
}

function infrastructure() {
    const config = Config(
        process.env,
        (length: number) => crypto.randomBytes(length).toString("base64"),
        () => os.cpus().length,
        (path: string) => path && fs.existsSync(path) && fs.statSync(path).isFile() ? fs.readFileSync(path, "utf-8") : undefined
    );

    const logStream = fs.createWriteStream((d => `${d.getFullYear()}_${d.getMonth()}_${d.getDate()}.log`)(new Date()), { encoding: "utf-8", flags: "a" });
    const log = (stdout: (...msg: unknown[]) => void, isError = false) => (...msg: unknown[]) => {
        const dt = new Date().toUTCString();
        const action = () => {
            if (isRight(config) && config.right.logToFiles)
                logStream.write([dt, process.pid].concat(msg.map(m => typeof m !== "string" ? JSON.stringify(m) : m)).join(" ") + "\n");
            stdout(dt, process.pid, ...msg);
        };
        if (isError) action(); else setImmediate(action);
    };
    const logger = Object.freeze({
        info: log(console.info),
        warn: log(console.warn),
        error: log(console.error, true)
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

    if (isLeft(config))
        return terminator("Config", config.left.message);

    const domain = new Domain(
        logger,
        { google: new GoogleIdTokenAdapter(config.right.authClient) },
        new NodeCryptoAdapter(config.right.tokenKey),
        new NodeFsAdapter(),
        new TextEncodingAdapter(),
        new VideoProcessorAdapter(),
        config.right
    );

    return {
        config: config.right,
        logger,
        terminator,
        domain
    };
}
