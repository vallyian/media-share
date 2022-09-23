import crypto from "node:crypto";

let CIPHER_KEY: string;
let CIPHER_ALGORITHM: string;

/**
 * Init adapter
 * @param cipherKey 32 bit base64 string
 * @param cipherAlgorithm see `openssl list -cipher-algorithms`
 */
export default function init(cipherKey: string, cipherAlgorithm?: string) {
    CIPHER_KEY = cipherKey || randomString(32);
    CIPHER_ALGORITHM = cipherAlgorithm || "aes-256-ctr";

    return {
        randomString,
        sha256,
        encrypt,
        decrypt
    };
}

function randomString(length = 32) {
    return crypto.randomBytes(length).toString("base64url");
}

function sha256(input: string) {
    return crypto.createHash("sha256").update(input).digest("base64");
}

function encrypt(input: string) {
    let iv: Buffer;
    return Promise.resolve()
        .then(() => input || Promise.reject("invalid input arg"))
        .then(() => {
            iv = Buffer.from(crypto.randomBytes(16));
            return Buffer.from(CIPHER_KEY, "base64url");
        })
        .then(key => crypto.createCipheriv(CIPHER_ALGORITHM, key, iv))
        .then(cipher => Buffer.concat([cipher.update(input), cipher.final()]))
        .then(encrypted => `${iv.toString("base64url")}:${encrypted.toString("base64url")}`);
}

function decrypt(input: string) {
    let iv: Buffer;
    let encrypted: Buffer;
    return Promise.resolve()
        .then(() => input && /^[a-z0-9-_]{22}:[a-z0-9-_]+$/i.test(input) || Promise.reject("invalid input arg"))
        .then(() => {
            const parts = input.split(":");
            iv = Buffer.from(<string>parts[0], "base64url");
            encrypted = Buffer.from(<string>parts[1], "base64url");
            return Buffer.from(CIPHER_KEY, "base64url");
        })
        .then(key => crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv))
        .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
}
