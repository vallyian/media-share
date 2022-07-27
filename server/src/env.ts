import os from "node:os";
import assert from "node:assert";

export const env = Object.freeze({
    /* from process.env - required => throw if missing */
    MEDIA_DIR: e("MEDIA_DIR", Error),

    /* from process.env - defaults implied */
    NODE_ENV: e("NODE_ENV", "production"),
    CLUSTERS: e("NODE_ENV", "") === "development" ? 1 : os.cpus().length,
    PORT: +e("PORT", "58082"),
    CERTS_DIR: e("CERTS_DIR", ""),

    /* other */
});

function e(env: string, required: ErrorConstructor | string): string {
    const val = process.env[env];
    return typeof val !== "undefined"
        ? String(val).trim()
        : (<ErrorConstructor>required).name === "Error"
            ? assert.fail(`env var ${env} not set`)
            : <string>required;
}
