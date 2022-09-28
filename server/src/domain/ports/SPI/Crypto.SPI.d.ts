export interface CryptoSPI {
    /**
     * Encrypt string
     */
    encrypt: (input: string) => Promise<string>;

    /**
     * Decrypt string
     */
    decrypt: (input: string) => Promise<string>;
}
