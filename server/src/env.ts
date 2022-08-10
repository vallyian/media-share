import fs from "node:fs";

import dotenv from "dotenv";

import * as process from "./internals/process";
import * as cryptoService from "./services/crypto.service";

loadEnvFile();

export const env = Object.freeze({
    G_CLIENT_ID: e("G_CLIENT_ID").string(v => /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(v)),
    G_EMAILS: e("G_EMAILS").list(v => v.split(","), v => /^.+@gmail.com$/i.test(v.trim())),
    NODE_ENV: e("NODE_ENV", () => "production").val,
    PORT: e("PORT", () => 58082).number(v => v > 0 && v <= 65536),
    COOKIE_PASS: e("COOKIE_PASS", () => cryptoService.randomString(256)).val,
    TOKEN_KEY: e("TOKEN_KEY", () => cryptoService.randomString(32)).val,

    VIEWS_DIR: e("NODE_ENV").val === "development" ? "src/views" : "views",
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

function loadEnvFile() {
    try {
        const envPath = fs.existsSync("./.env") ? "./.env" : fs.existsSync("/run/secrets/.env") ? "/run/secrets/.env" : undefined;
        if (envPath)
            Object.entries(dotenv.parse(fs.readFileSync(envPath))).forEach(([k, v]) => process.env[k] = process.env[k] || v);
    } catch (_err) { /* */ }
}

function err(key: string) {
    return process.exit(process.ExitCode.Environment, `env var ${key} invalid`);
}
