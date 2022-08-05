import os from "node:os";
import crypto from "node:crypto";

import { globals, processExit } from "./globals";

export const env = Object.freeze({
    /* from process.env - required => throw if missing */

    /* from process.env - defaults implied */
    NODE_ENV: e("NODE_ENV", "production"),
    CLUSTERS: e("NODE_ENV", "") === "development" ? 1 : os.cpus().length,
    PORT: +e("PORT", "58082"),

    /* other */
    VIEWS_DIR: e("NODE_ENV", "production") === "development" ? "src/views" : "views",
    COOKIE_PASS: crypto.randomBytes(256).toString("base64url")
});

function e(env: string, required: ErrorConstructor | string): string {
    const val = globals.process.env[env];
    return typeof val !== "undefined"
        ? String(val).trim()
        : (<ErrorConstructor>required).name === "Error"
            ? processExit(1, `env var ${env} not set`)
            : <string>required;
}
