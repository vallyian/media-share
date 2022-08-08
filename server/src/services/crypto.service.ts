import crypto from "node:crypto";

// TODO: use hashicorp vault for secrets management https://hub.docker.com/_/vault
const ALGORITHM = "aes-256-ctr";
const ivAndKey = Buffer.from(randomString(48), "base64url");
const iv = ivAndKey.slice(0, 16);
const key = ivAndKey.slice(16, 48);

export function randomString(length: number): string {
    return crypto.randomBytes(length).toString("base64url");
}

export function encrypt(plain: string): Promise<string> {
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    return Promise.resolve()
        .then(() => plain
            || Promise.reject("invalid plain arg"))
        .then(() => Buffer.concat([cipher.update(plain || ""), cipher.final()]).toString("base64url"));
}

export function decrypt(encrypted: string): Promise<string> {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    return Promise.resolve()
        .then(() => encrypted
            || Promise.reject("invalid encrypted arg"))
        .then(() => Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString());
}
