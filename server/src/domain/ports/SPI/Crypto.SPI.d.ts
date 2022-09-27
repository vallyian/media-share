export interface CryptoSPI {
    /**
     * Generate the given number of random bytes and format as base64url
     */
    randomString: (length: number) => string;

    /**
     * Calculate SHA256 hash
     */
    sha256: (input: string) => string;

    /**
     * Encrypt string
     */
    encrypt: (input: string) => Promise<string>;

    /**
     * Decrypt string
     */
    decrypt: (input: string) => Promise<string>;
}
