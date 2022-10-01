import crypto from "node:crypto";
import { CryptoSPI } from "../domain/ports/SPI/Crypto.SPI";

export class NodeCryptoAdapter implements CryptoSPI {
    static encrypt(input: string, cipherKey: string, cipherAlgorithm: string, encoding: BufferEncoding) {
        let iv: Buffer;
        return Promise.resolve()
            .then(() => input || Promise.reject("invalid input arg"))
            .then(() => {
                iv = Buffer.from(crypto.randomBytes(16));
                return Buffer.from(cipherKey, encoding);
            })
            .then(key => crypto.createCipheriv(cipherAlgorithm, key, iv))
            .then(cipher => Buffer.concat([cipher.update(input), cipher.final()]))
            .then(encrypted => `${iv.toString(encoding)}:${encrypted.toString(encoding)}`);
    }

    static decrypt(input: string, cipherKey: string, cipherAlgorithm: string, encoding: BufferEncoding) {
        let iv: Buffer;
        let encrypted: Buffer;
        return Promise.resolve()
            .then(() => {
                const parts = input.split(":");
                iv = Buffer.from(<string>parts[0], encoding);
                encrypted = Buffer.from(<string>parts[1], encoding);
                return Buffer.from(cipherKey, encoding);
            })
            .then(key => crypto.createDecipheriv(cipherAlgorithm, key, iv))
            .then(decipher => Buffer.concat([decipher.update(encrypted), decipher.final()]).toString());
    }

    /**
     * @param cipherKey 32 bit base64 string
     * @param cipherAlgorithm see `openssl list -cipher-algorithms`; if not provided, "aes-256-ctr" will be used
     * @param encoding; if not provided, "base64url" will be used
     */
    constructor(
        private readonly cipherKey: string,
        private readonly cipherAlgorithm = "aes-256-ctr",
        private readonly encoding: BufferEncoding = "base64url"
    ) { }

    /** @inheritdoc */
    encrypt = (input: string) => NodeCryptoAdapter.encrypt(input, this.cipherKey, this.cipherAlgorithm, this.encoding);

    /** @inheritdoc */
    decrypt = (input: string) => NodeCryptoAdapter.decrypt(input, this.cipherKey, this.cipherAlgorithm, this.encoding);
}
