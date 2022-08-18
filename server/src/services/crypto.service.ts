import crypto from "node:crypto";

import { env } from "../env";

// TODO: use hashicorp vault for secrets management https://hub.docker.com/_/vault
const ALGORITHM = "aes-256-ctr";

export function randomString(length = 32): string {
    return crypto.randomBytes(length).toString("base64url");
}

export function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("base64");
}

export function encrypt(value: string): Promise<string> {
    let iv: Buffer;
    return Promise.resolve()
        .then(() => value || Promise.reject("invalid plain arg"))
        .then(() => {
            iv = Buffer.from(crypto.randomBytes(16));
            return Buffer.from(env.TOKEN_KEY, "base64url");
        })
        .then(key => crypto.createCipheriv(ALGORITHM, key, iv))
        .then(cipher => Buffer.concat([cipher.update(value), cipher.final()]))
        .then(encrypted => `${iv.toString("base64url")}:${encrypted.toString("base64url")}`);
}

export function decrypt(value: string): Promise<string> {
    let iv: Buffer;
    let encrypted: Buffer;
    return Promise.resolve()
        .then(() => value && /^[a-z0-9-_]{22}:[a-z0-9-_]+$/i.test(value) || Promise.reject("invalid encrypted arg"))
        .then(() => {
            const parts = value.split(":");
            iv = Buffer.from(<string>parts[0], "base64url");
            encrypted = Buffer.from(<string>parts[1], "base64url");
            return Buffer.from(env.TOKEN_KEY, "base64url");
        })
        .then(key => crypto.createDecipheriv(ALGORITHM, key, iv))
        .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
}
