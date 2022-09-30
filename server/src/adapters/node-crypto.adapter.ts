import crypto from "node:crypto";
import { CryptoSPI } from "../domain/ports/SPI/Crypto.SPI";

export class NodeCryptoAdapter implements CryptoSPI {
    /**
     * @param cipherKey 32 bit base64 string; if not provided, a unique one will be generated
     * @param cipherAlgorithm see `openssl list -cipher-algorithms`; if not provided, "aes-256-ctr" will be used
     * @param encoding; if not provided, "base64url" will be used
     */
    constructor(
        private readonly cipherKey: string,
        private readonly cipherAlgorithm = "aes-256-ctr",
        private readonly encoding: BufferEncoding = "base64url"
    ) { }

    /** @inheritdoc */
    encrypt(input: string) {
        let iv: Buffer;
        return Promise.resolve()
            .then(() => input || Promise.reject("invalid input arg"))
            .then(() => {
                iv = Buffer.from(crypto.randomBytes(16));
                return Buffer.from(<string>this.cipherKey, this.encoding);
            })
            .then(key => crypto.createCipheriv(<string>this.cipherAlgorithm, key, iv))
            .then(cipher => Buffer.concat([cipher.update(input), cipher.final()]))
            .then(encrypted => `${iv.toString(this.encoding)}:${encrypted.toString(this.encoding)}`);
    }

    /** @inheritdoc */
    decrypt(input: string) {
        let iv: Buffer;
        let encrypted: Buffer;
        return Promise.resolve()
            .then(() => {
                const parts = input.split(":");
                iv = Buffer.from(<string>parts[0], this.encoding);
                encrypted = Buffer.from(<string>parts[1], this.encoding);
                return Buffer.from(<string>this.cipherKey, this.encoding);
            })
            .then(key => crypto.createDecipheriv(<string>this.cipherAlgorithm, key, iv))
            .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
    }
}
