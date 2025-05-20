import crypto from "node:crypto";
import { CryptoSPI } from "../domain/ports/SPI/Crypto.SPI";

/**
 * @param cipherKey 32 bit base64 stringc:\Users\vally\AppData\Local\Programs\Microsoft VS Code\resources\app\out\vs\code\electron-sandbox\workbench\workbench.html
 * @param cipherAlgorithm see `openssl list -cipher-algorithms`; if not provided, "aes-256-ctr" will be used
 * @param encoding; if not provided, "base64url" will be used
 */
export function nodeCryptoAdapter(
    cipherKey: string,
    cipherAlgorithm = "aes-256-ctr",
    encoding: BufferEncoding = "base64url"
): CryptoSPI {
    return {
        encrypt: encrypt(cipherKey, cipherAlgorithm, encoding),
        decrypt: decrypt(cipherKey, cipherAlgorithm, encoding)
    };
}

function encrypt(cipherKey: string, cipherAlgorithm: string, encoding: BufferEncoding) {
    return (input: string) => {
        let iv: Buffer;
        return Promise.resolve()
            .then(() => input || Promise.reject(Error("invalid input arg")))
            .then(() => {
                iv = Buffer.from(crypto.randomBytes(16));
                return Buffer.from(cipherKey, encoding);
            })
            .then(key => crypto.createCipheriv(cipherAlgorithm, key, iv))
            .then(cipher => Buffer.concat([cipher.update(input), cipher.final()]))
            .then(encrypted => `${iv.toString(encoding)}:${encrypted.toString(encoding)}`);
    };
}

function decrypt(cipherKey: string, cipherAlgorithm: string, encoding: BufferEncoding) {
    return (input: string) => {
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
    };
}
