export interface TextEncodingSPI {
    /**
     * Decode buffer as text using the most probable detected encoding
     * @param buffer
     */
    decode(buffer: Buffer): string;
}
