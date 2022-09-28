export interface SubtitleAPI {
    /**
     * Convert subtitle to web VTT format
     * @param subtitlePath
     * @param videoExtension
     */
    convert(subtitlePath: string, videoExtension?: string): Promise<string>;
}
