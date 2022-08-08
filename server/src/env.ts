import os from "node:os";
import fs from "node:fs";

import dotenv from "dotenv";

import * as process from "./internals/process";

let envFile: dotenv.DotenvParseOutput;

export const env = Object.freeze({
    G_CLIENT_ID: e("G_CLIENT_ID").string(v => /^[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(v)),
    G_EMAILS: e("G_EMAILS").list(v => v.split(","), v => /^.+@gmail.com$/i.test(v.trim())),
    NODE_ENV: e("NODE_ENV", "production").val,
    PORT: e("PORT", 58082).number(v => v > 0 && v <= 65536),

    CLUSTERS: e("NODE_ENV").val === "development" ? 1 : os.cpus().length,
    VIEWS_DIR: e("NODE_ENV").val === "development" ? "src/views" : "views"
});

function e(key: string, def?: unknown) {
    const val = (v => typeof v !== "undefined" ? String(v).trim() : def ? String(def) : "")(process.env[key] || fromEnvFile(key));
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

function fromEnvFile(key: string): string | undefined {
    if (!envFile) {
        const envPath = fs.existsSync("./.env") ? "./.env" : fs.existsSync("/run/secrets/.env") ? "/run/secrets/.env" : undefined;
        envFile = envPath ? dotenv.parse(fs.readFileSync(envPath)) : {};
    }
    return envFile[key];
}

function err(key: string) {
    return process.exit(process.ExitCode.Environment, `env var ${key} invalid`);
}
