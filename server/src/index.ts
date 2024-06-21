import fs from "node:fs";
import { isRight, isLeft, Left, Right } from "fp-ts/lib/Either";
import { domain } from "./domain";
import { googleIdTokenAdapter } from "./adapters/google-id-token.adapter";
import { nodeCryptoAdapter } from "./adapters/node-crypto.adapter";
import { nodeFsAdapter } from "./adapters/node-fs.adapter";
import { Service } from "./service";
import { Config } from "./config";
import { textEncodingAdapter } from "./adapters/text-encoding.adapter";
import { videoProcessorAdapter } from "./adapters/video-processor.adapter";

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
        if (!l?.includes("=")) return;

        const [k, vtmp] = l.split("=").map(s => s.trim());
        const v = vtmp?.replace(/(^["']|["']$)/g, "").trim();
        if (!k || !v) return;

        process.env[k] = v;
    });
}

function runnerFactory() {
    const { logger, terminator, config, appDomain } = infrastructure();
    const service = Service(config, logger, terminator, appDomain);
    return () => service().catch(err => terminator("Generic", err));
}

// eslint-disable-next-line sonarjs/cognitive-complexity
function infrastructure() {
    const config = Config();

    const logStream = fs.createWriteStream((d => `${d.getFullYear()}_${d.getMonth()}_${d.getDate()}.log`)(new Date()), { encoding: "utf-8", flags: "a" });
    const log = logFn(config, logStream);
    const logger = Object.freeze({
        info: log(console.info),
        warn: log(console.warn),
        error: log(console.error, true)
    });
    const terminator = terminatorFn(logger.error);

    if (isLeft(config))
        return terminator("Config", config.left.message);

    const appDomain = domain(
        logger,
        { google: googleIdTokenAdapter(config.right.authClient) },
        nodeCryptoAdapter(config.right.tokenKey),
        nodeFsAdapter,
        textEncodingAdapter,
        videoProcessorAdapter(),
        config.right
    );

    return {
        config: config.right,
        logger,
        terminator,
        appDomain
    };
}

function logFn(config: Left<Error> | Right<Config>, logStream: fs.WriteStream) {
    return (stdout: (...msg: unknown[]) => void, isError = false) => (...msg: unknown[]) => {
        const dt = new Date().toUTCString();
        const action = () => {
            if (isRight(config) && config.right.logToFiles)
                logStream.write([dt, process.pid].concat(msg.map(m => typeof m !== "string" ? JSON.stringify(m) : m)).join(" ") + "\n");
            stdout(dt, process.pid, ...msg);
        };
        if (isError) action(); else setImmediate(action);
    };
}

function terminatorFn(logError: (...msg: unknown[]) => void) {
    return (codes => (code: keyof typeof codes, ...error: unknown[]): never => {
        if (error) logError("Critical", ...error);
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
}
