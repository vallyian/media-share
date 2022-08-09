import fs from "node:fs";

import dotenv from "dotenv";

import * as process from "./internals/process";
import { randomString } from "./services/crypto.service";

loadEnvFile();

export const env = Object.freeze({
    G_CLIENT_ID: e("G_CLIENT_ID").string(v => /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(v)),
    G_EMAILS: e("G_EMAILS").list(v => v.split(","), v => /^.+@gmail.com$/i.test(v.trim())),
    NODE_ENV: e("NODE_ENV", "production").val,
    PORT: e("PORT", 58082).number(v => v > 0 && v <= 65536),

    VIEWS_DIR: e("NODE_ENV").val === "development" ? "src/views" : "views",
    COOKIE_PASS: e("COOKIE_PASS", randomString(256)).val,
    TOKEN_KEY: e("TOKEN_KEY", randomString()).val
});

function e(key: string, def?: unknown) {
    const val = (v => typeof v !== "undefined" ? String(v).trim() : def ? String(def) : "")(process.env[key]);
    return {
        val,
        string: (validator: (v: string) => boolean) => (validator ? validator(val) : true) ? val : err(key),
        number: (validator: (v: number) => boolean) => validator(+val) ? +val : err(key),
        list: (transformer: (v: string) => string[], validator: (v: string) => boolean) => {
            const vals = transformer(val);
            return vals.length && vals.every(validator) ? vals : err(key);
        }
    };
}

function loadEnvFile() {
    const envPath = fs.existsSync("./.env") ? "./.env" : fs.existsSync("/run/secrets/.env") ? "/run/secrets/.env" : undefined;
    if (envPath)
        Object.entries(dotenv.parse(fs.readFileSync(envPath)))
            .forEach(([k, v]) => { if (process.env[k] === undefined) process.env[k] = v; });
}

function err(key: string) {
    return process.exit(process.ExitCode.Environment, `env var ${key} invalid`);
}
