import crypto from "node:crypto";

let _cipherKey: string;
let _cipherAlgorithm: string;

/**
 * Init adapter
 * @param cipherKey 32 bit base64 string
 * @param cipherAlgorithm see `openssl list -cipher-algorithms`
 */
export default function init(cipherKey: string, cipherAlgorithm?: string) {
    _cipherKey = cipherKey || randomString(32);
    _cipherAlgorithm = cipherAlgorithm || "aes-256-ctr";

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
            return Buffer.from(_cipherKey, "base64url");
        })
        .then(key => crypto.createCipheriv(_cipherAlgorithm, key, iv))
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
            return Buffer.from(_cipherKey, "base64url");
        })
        .then(key => crypto.createDecipheriv(_cipherAlgorithm, key, iv))
        .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
}
