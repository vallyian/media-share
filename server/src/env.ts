import os from "node:os";
import assert from "node:assert";

import { globals } from "../globals";

export const env = Object.freeze({
    /* from process.env - required => throw if missing */

    /* from process.env - defaults implied */
    NODE_ENV: e("NODE_ENV", "production"),
    CLUSTERS: e("NODE_ENV", "") === "development" ? 1 : os.cpus().length,
    PORT: +e("PORT", "58082"),
    MEDIA_DIR: e("MEDIA_DIR", "/media"),
    CERT_CRT: e("CERT_CRT", "/run/secrets/cert.crt"),
    CERT_KEY: e("CERT_KEY", "/run/secrets/cert.key"),

    /* other */
});

function e(env: string, required: ErrorConstructor | string): string {
    const val = globals.process.env[env];
    return typeof val !== "undefined"
        ? String(val).trim()
        : (<ErrorConstructor>required).name === "Error"
            ? assert.fail(`env var ${env} not set`)
            : <string>required;
}
