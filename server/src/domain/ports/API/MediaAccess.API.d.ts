import { MediaType } from "../SPI/MediaStorage.SPI";

export {
    MediaAccessAPI,

    MediaStat,
    MediaType,
    PathLink,
    ParsedPath
};

interface MediaAccessAPI {
    /**
     * Parse path, return secure path info (or empty strings)
     * @param insecurePath
     */
    parsePath(insecurePath: string): ParsedPath;

    /**
     * Get media type; does not throw, returns "error" instead
     * @param insecurePath
     */
    type(insecurePath: string): Promise<MediaType>;

    /**
     * Get directory listing
     * @param insecurePath
     * @param baseUrl proxy base URL
     */
    listDir(insecurePath: string, baseUrl?: string): Promise<MediaStat[]>;

    /**
     * Get file contents
     * @param insecurePath
     */
    getFile(insecurePath: string): Promise<Buffer>;

    /**
     * Get video file extension if supported
     * @param insecurePath
     */
    supportedVideoExtension(insecurePath: string): string | undefined;

    /**
     * Get subtitle file extension if supported
     * @param insecurePath
     */
    supportedSubtitleExtension(insecurePath: string): string | undefined;

    /**
     * Get URL links from path
     * @param insecurePath
     * @param baseUrl proxy base URL
     */
    pathLinks(insecurePath: string, baseUrl?: string): PathLink[];

    /**
     * Get URL from path
     * @param insecurePath
     * @param baseUrl proxy base URL
     */
    getSecureUrl(insecurePath: string, baseUrl?: string): string;
}

interface PathLink {
    name: string;
    link: string;
}

interface MediaStat {
    name: string;
    size: string;
    link: string;
    isDir: boolean;
}

interface ParsedPath {
    mediaPath: string;
    parent: string;
    name: string;
    extension: string;
}
