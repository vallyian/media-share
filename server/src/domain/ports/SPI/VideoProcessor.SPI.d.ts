export interface VideoProcessorSPI {
    /**
     * Get video FPS
     * @param insecurePath
     * @throws Error
     */
    getFps(insecurePath: string): Promise<number>;
}
