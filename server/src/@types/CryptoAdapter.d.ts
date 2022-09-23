export type CryptoAdapter = {
    randomString: (length: number) => string;
    sha256: (input: string) => string;
    encrypt: (input: string) => Promise<string>;
    decrypt: (input: string) => Promise<string>;
}
