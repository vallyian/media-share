import crypto from "node:crypto";
import { CryptoSPI } from "../domain/ports/SPI/Crypto.SPI";

export class NodeCryptoAdapter implements CryptoSPI {
    /**
     * @param cipherKey 32 bit base64 string; if not provided, a unique one will be generated
     * @param cipherAlgorithm see `openssl list -cipher-algorithms`; if not provided, "aes-256-ctr" will be used
     */
    constructor(
        private readonly cipherKey: string,
        private readonly cipherAlgorithm = "aes-256-ctr"
    ) { }

    /** @inheritdoc */
    encrypt(input: string) {
        let iv: Buffer;
        return Promise.resolve()
            .then(() => input || Promise.reject("invalid input arg"))
            .then(() => {
                iv = Buffer.from(crypto.randomBytes(16));
                return Buffer.from(<string>this.cipherKey, "base64url");
            })
            .then(key => crypto.createCipheriv(<string>this.cipherAlgorithm, key, iv))
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
                return Buffer.from(<string>this.cipherKey, "base64url");
            })
            .then(key => crypto.createDecipheriv(<string>this.cipherAlgorithm, key, iv))
            .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
    }
}
