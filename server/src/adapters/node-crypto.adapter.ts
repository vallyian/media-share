import crypto from "node:crypto";
import { CryptoSPI } from "../domain/ports/SPI/Crypto.SPI";

export class NodeCryptoAdapter implements CryptoSPI {
    /**
     * @param cipherKey 32 bit base64 string
     * @param cipherAlgorithm see `openssl list -cipher-algorithms`
     */
    constructor(
        private readonly cipherKey: string,
        private readonly cipherAlgorithm = "aes-256-ctr"
    ) {
        this.cipherKey = cipherKey || this.randomString(32);
    }

    /** @inheritdoc */
    randomString(length = 32) {
        return crypto.randomBytes(length).toString("base64url");
    }

    /** @inheritdoc */
    sha256(input: string) {
        return crypto.createHash("sha256").update(input).digest("base64");
    }

    /** @inheritdoc */
    encrypt(input: string) {
        let iv: Buffer;
        return Promise.resolve()
            .then(() => input || Promise.reject("invalid input arg"))
            .then(() => {
                iv = Buffer.from(crypto.randomBytes(16));
                return Buffer.from(this.cipherKey, "base64url");
            })
            .then(key => crypto.createCipheriv(this.cipherAlgorithm, key, iv))
            .then(cipher => Buffer.concat([cipher.update(input), cipher.final()]))
            .then(encrypted => `${iv.toString("base64url")}:${encrypted.toString("base64url")}`);
    }

    /** @inheritdoc */
    decrypt(input: string) {
        let iv: Buffer;
        let encrypted: Buffer;
        return Promise.resolve()
            .then(() => input && /^[a-z0-9-_]{22}:[a-z0-9-_]+$/i.test(input) || Promise.reject("invalid input arg"))
            .then(() => {
                const parts = input.split(":");
                iv = Buffer.from(<string>parts[0], "base64url");
                encrypted = Buffer.from(<string>parts[1], "base64url");
                return Buffer.from(this.cipherKey, "base64url");
            })
            .then(key => crypto.createDecipheriv(this.cipherAlgorithm, key, iv))
            .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
    }
}
