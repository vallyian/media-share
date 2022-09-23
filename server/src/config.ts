import os from "node:os";
import dotenv from "dotenv";
import processHelper from "./helpers/process.helper";
import fsService from "./services/fs.service";

let cookiePass: (() => string) | undefined;
export function init(_cookiePass: () => string) {
    cookiePass = _cookiePass;
}

tryLoadEnvFile();

export default Object.freeze({
    AUTH_CLIENT: env("AUTH_CLIENT").string(v => !!v),
    AUTH_EMAILS: env("AUTH_EMAILS").list(v => v.split(",").map(s => s.trim()).filter(s => !!s), v => v.includes("@")),
    NODE_ENV: env("NODE_ENV", () => "production").val,
    PORT: env("PORT", () => 58082).number(v => v > 0 && v <= 65536),
    COOKIE_PASS: env("COOKIE_PASS", cookiePass).val,
    TOKEN_KEY: env("TOKEN_KEY").val,
    PROXY_LOCATION: env("PROXY_LOCATION", () => "/").val,
    CLUSTES: env("NODE_ENV").val === "development" ? 1 : os.cpus().length,
    RATE_LIMIT_MINUTES: env("RATE_LIMIT_MINUTES", () => 5).number(v => v > 0 && v <= 24 * 60),
    RATE_LIMIT_COUNTER: Math.ceil(+env("RATE_LIMIT_MINUTES", () => 5).val * 60 * 5 / (env("NODE_ENV").val === "development" ? 1 : os.cpus().length)),

    mediaDir: "media",
    supportedVideos: [".mp4"],
    get supportedVideosRx() { return new RegExp("(:?" + this.supportedVideos.map((e: string) => `\\${e}`).join("|") + ")$", "i"); },
    supportedSubtitles: [".srt", ".sub"],
    get supportedSubtitlesRx() { return new RegExp("(:?" + this.supportedSubtitles.map((e: string) => `\\${e}`).join("|") + ")$", "i"); },
});

function env(key: string, def?: () => unknown) { return validate(key, process.env[key], def); }

function validate(key: string, val?: string, def?: () => unknown) {
    const valOrEmpty = typeof val !== "undefined" ? String(val).trim() : "";
    const defVal = def instanceof Function ? String(def()).trim() : "";
    return {
        val: valOrEmpty || defVal,
        string: (validator: (v: string) => boolean) => validator(valOrEmpty) ? valOrEmpty : validator(defVal) ? defVal : err(key),
        number: (validator: (v: number) => boolean) => validator(+valOrEmpty) ? +valOrEmpty : validator(+defVal) ? +defVal : err(key),
        list: (transformer: (v: string) => string[], validator: (v: string) => boolean) => {
            const vals = transformer(valOrEmpty);
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
    return processHelper.exit("Environment", `config key ${key} invalid`);
}
