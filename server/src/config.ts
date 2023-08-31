import process from "node:process";
import os from "node:os";
import fs from "node:fs";
import crypto from "node:crypto";
import { left, right } from "fp-ts/lib/Either";

export type Config = Extract<ReturnType<typeof Config>, { _tag: "Right" }>["right"];
export function Config(
    env = process.env,
    randomStringFactory = (length: number) => crypto.randomBytes(length).toString("base64"),
    clustersFactory = () => os.cpus().length,
    readFile = readFileFn
) {
    const invalidConfig = new Array<string>();
    const getEnvStr = envStringFn(env);
    const getEnvNum = envNumberFn(env, invalidConfig);
    const getFileStr = fileStringFn(readFile);

    const NODE_ENV = getEnvStr("NODE_ENV", getEnvStr("TS_NODE_DEV", "false") === "true" ? "development" : "production");
    const clusters = NODE_ENV === "development" ? 1 : clustersFactory();

    const config = {
        NODE_ENV,
        clusters,
        authClient: getEnvStr("MEDIA_SHARE__AuthClient"),
        authEmails: getEnvStr("MEDIA_SHARE__AuthEmails").split(",").map(s => s.trim()).filter(s => s.includes("@")),
        authDav: getEnvStr("MEDIA_SHARE__AuthDav").split(",").map(s => s.trim()).filter(s => s.includes(":")),
        davport: getEnvNum("MEDIA_SHARE__DavPort", 58092, 1, 65535),
        webport: getEnvNum("MEDIA_SHARE__WebPort", 58082, 1, 65535),
        proxyLocation: getEnvStr("MEDIA_SHARE__ProxyLocation", "/"),
        mediaDir: getEnvStr("MEDIA_SHARE__MediaDir", "media"),
        rateLimitPerSecond: Math.ceil(getEnvNum("MEDIA_SHARE__RateLimitPerSecond", 20 * clusters) / clusters),
        rateLimitBurstFactor: getEnvNum("MEDIA_SHARE__RateLimitBurstFactor", 10),
        rateLimitPeriodMinutes: getEnvNum("MEDIA_SHARE__RateLimitPeriodMinutes", 1),
        tokenKey: getEnvStr("MEDIA_SHARE__TokenKey", randomStringFactory(32)),
        cookieSecret: getEnvStr("MEDIA_SHARE__CookieSecret", randomStringFactory(32)),
        certCrt: getFileStr(getEnvStr("MEDIA_SHARE__CertCrt"), "/run/secrets/cert.crt", "certs/cert.crt"),
        certKey: getFileStr(getEnvStr("MEDIA_SHARE__CertKey"), "/run/secrets/cert.key", "certs/cert.key"),
        logToFiles: getEnvStr("MEDIA_SHARE__LogToFiles") === "true",

        get clusterSharedEnv() {
            return {
                "MEDIA_SHARE__TokenKey": this.tokenKey,
                "MEDIA_SHARE__CookieSecret": this.cookieSecret
            };
        }
    };

    return invalidConfig.length
        ? left(Error(`config key(s) ${invalidConfig.join(", ")} invalid`))
        : right(config);
}

function envNumberFn(
    env: Record<string, string | undefined>,
    invalidConfig = new Array<string>()
) {
    return (key: string, def = 0, min = NaN, max = NaN) => {
        const val = +<string>env[key] || NaN;
        const isNum = (n: number) => isFinite(n) && (isNaN(min) || n >= min) && (isNaN(max) || n <= max);

        if (isNum(val)) return val;
        if (isNum(def)) return def;
        invalidConfig.push(key);
        return NaN;
    };
}

function envStringFn(env: Record<string, string | undefined>) {
    return (key: string, def = "") => env[key] ?? def;
}

function readFileFn(path: string | undefined) {
    return path && fs.existsSync(path) && fs.statSync(path).isFile()
        ? fs.readFileSync(path, "utf-8")
        : undefined;
}

function fileStringFn(readFile: (path: string | undefined) => string | undefined) {
    return (...keys: string[]) => {
        let val: string | undefined;
        do {
            val = readFile(keys.shift());
            if (val) break;
        } while (keys.length);
        return val;
    };
}
