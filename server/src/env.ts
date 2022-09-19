import os from "node:os";
import dotenv from "dotenv";
import processHelper from "./helpers/process.helper";
import cryptoService from "./services/crypto.service";
import fsService from "./services/fs.service";

tryLoadEnvFile();

export default Object.freeze({
    AUTH_CLIENT: e("AUTH_CLIENT").string(v => !!v),
    AUTH_EMAILS: e("AUTH_EMAILS").list(v => v.split(",").map(s => s.trim()).filter(s => !!s), v => v.includes("@")),
    NODE_ENV: e("NODE_ENV", () => "production").val,
    PORT: e("PORT", () => 58082).number(v => v > 0 && v <= 65536),
    COOKIE_PASS: e("COOKIE_PASS", () => cryptoService.randomString(256)).val,
    TOKEN_KEY: e("TOKEN_KEY", () => cryptoService.randomString(32)).val,
    PROXY_LOCATION: e("PROXY_LOCATION", () => "/").val,

    CLUSTES: e("NODE_ENV").val === "development" ? 1 : os.cpus().length,
    RATE_LIMIT_MINUTES: e("RATE_LIMIT_MINUTES", () => 5).number(v => v > 0 && v <= 24 * 60),
    RATE_LIMIT_COUNTER: Math.ceil(+e("RATE_LIMIT_MINUTES", () => 5).val * 60 * 5 / (e("NODE_ENV").val === "development" ? 1 : os.cpus().length))
});

function e(key: string, def?: () => unknown) {
    const env = process.env[key];
    const val = typeof env !== "undefined" ? String(env).trim() : "";
    const defVal = def instanceof Function ? String(def()).trim() : "";
    return {
        val: val || defVal,
        string: (validator: (v: string) => boolean) => validator(val) ? val : validator(defVal) ? defVal : err(key),
        number: (validator: (v: number) => boolean) => validator(+val) ? +val : validator(+defVal) ? +defVal : err(key),
        list: (transformer: (v: string) => string[], validator: (v: string) => boolean) => {
            const vals = transformer(val);
            if (vals.length && vals.every(validator)) return vals;
            const defVals = transformer(defVal);
            if (defVals.length && defVals.every(validator)) return defVals;
            return err(key);
        }
    };
}

function tryLoadEnvFile() {
    try {
        const envFile = fsService.readFileSync([".env"]);
        if (envFile)
            Object.entries(dotenv.parse(envFile)).forEach(([k, v]) => process.env[k] = process.env[k] || v);
    } catch (_err) { /* */ }
}

function err(key: string) {
    return processHelper.exit("Environment", `env var ${key} invalid`);
}
