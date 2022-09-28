import { MediaAccessAPI, MediaType, MediaStat, PathLink, ParsedPath } from "../ports/API/MediaAccess.API";
import { MediaStorageSPI } from "../ports/SPI/MediaStorage.SPI";
import { Domain } from "..";

export class MediaAccessService implements MediaAccessAPI {
    constructor(
        private mediaStorageAdapter: MediaStorageSPI,
        private readonly config: {
            mediaDir: string,
        }
    ) { }

    /** @inheritdoc */
    parsePath(insecurePath: string): ParsedPath {
        const securePathSegments = this.getSecurePathSegments(insecurePath);
        const secureMediaPath = this.mediaStorageAdapter.join(this.config.mediaDir, ...securePathSegments);
        const secureParentDir = this.mediaStorageAdapter.join(...securePathSegments.slice(0, -1));
        const secureName = securePathSegments.length >= 1 ? <string>securePathSegments[securePathSegments.length - 1] : "";
        const secureNameDotSegments = secureName.split(/\./g);
        const secureExtension = secureNameDotSegments.length >= 2 ? <string>secureNameDotSegments[secureNameDotSegments.length - 1] : "";

        return {
            mediaPath: secureMediaPath,
            parent: secureParentDir,
            name: secureName,
            extension: secureExtension
        };
    }

    /** @inheritdoc */
    async type(insecurePath: string): Promise<MediaType> {
        if (typeof insecurePath !== "string" || insecurePath === "")
            return "error";

        const secureMediaPath = this.getSecureMediaPath(insecurePath);

        return this.mediaStorageAdapter.type(secureMediaPath)
            .catch(() => "error");
    }

    /** @inheritdoc */
    async listDir(insecurePath: string, baseUrl?: string): Promise<MediaStat[]> {
        if (typeof insecurePath !== "string" || insecurePath === "")
            throw Error("invalid item path");

        const secureMediaType = await this.type(insecurePath);
        if (secureMediaType !== "dir")
            throw Error("not a directory");

        const secureUrl = this.getSecureUrl(insecurePath, baseUrl);
        const secureMediaPath = this.getSecureMediaPath(insecurePath);
        const mediaStats = await this.mediaStorageAdapter.readDir(secureMediaPath);
        const linkMediaStats = mediaStats
            .map(s => ({
                ...s,
                size: this.size(s.size),
                link: `${secureUrl ? "/" : ""}${secureUrl}/${encodeURIComponent(s.name)}`
            }))
            .sort((a, b) => this.sort(a, b));

        return linkMediaStats;
    }

    /** @inheritdoc */
    async getFile(insecurePath: string): Promise<Buffer> {
        if (typeof insecurePath !== "string" || insecurePath === "")
            throw Error("invalid item path");

        const secureMediaType = await this.type(insecurePath);
        if (secureMediaType !== "file")
            throw Error("not a file");

        const securePath = this.getSecureMediaPath(insecurePath);

        const file = this.mediaStorageAdapter.readFile(securePath);

        return file;
    }

    /** @inheritdoc */
    supportedVideoExtension(insecurePath: string): string | undefined {
        const extension = this.parsePath(insecurePath).extension;
        const isSupported = Domain.supportedVideos.includes(extension);
        return isSupported ? extension : undefined;
    }

    /** @inheritdoc */
    supportedSubtitleExtension(insecurePath: string): string | undefined {
        const extension = this.parsePath(insecurePath).extension;
        const isSupported = Domain.supportedSubtitles.includes(extension);
        return isSupported ? extension : undefined;
    }

    /** @inheritdoc */
    pathLinks(insecurePath: string, baseUrl?: string): PathLink[] {
        if (typeof insecurePath !== "string" || insecurePath === "")
            throw Error("invalid item path");

        const securePathSegments = this.getSecurePathSegments(insecurePath);
        const secureBaseUrl = baseUrl ? this.getSecureUrl(baseUrl) : "";
        const pills: PathLink[] = [{ name: "media", link: secureBaseUrl || "/" }];

        let link = "";
        for (const name of securePathSegments) {
            link += `/${encodeURIComponent(name)}`;
            pills.push({
                name,
                link: `${secureBaseUrl}${link}`
            });
        }

        return pills;
    }

    /** @inheritdoc */
    getSecureUrl(insecurePath: string, baseUrl?: string): string {
        const secureUrl = this.getSecurePathSegments(insecurePath, baseUrl)
            .map(u => encodeURIComponent(u))
            .join("/");
        return secureUrl;
    }

    private getSecurePath(insecurePath: string, baseUrl?: string) {
        const securePathSegments = this.getSecurePathSegments(insecurePath, baseUrl);
        const securePath = this.mediaStorageAdapter.join(...securePathSegments);
        return securePath;
    }

    private getSecureMediaPath(insecurePath: string, baseUrl?: string) {
        const securePath = this.getSecurePath(insecurePath, baseUrl);
        const secureMediaPath = this.mediaStorageAdapter.join(this.config.mediaDir, securePath);
        return secureMediaPath;
    }

    private getSecurePathSegments(insecurePath: string, insecurePathPrefix?: string) {
        const getSecureSegments = (path: string) => path.split(/(?:\\|\/)/g).map(s => decodeURIComponent(s)).filter(p => !!p && p !== "." && p != "..");
        const arr = (insecurePathPrefix ? getSecureSegments(insecurePathPrefix) : [])
            .concat(getSecureSegments(insecurePath));
        return arr;
    }

    private size(value: number): string {
        switch (true) {
            case value < 1000: return `${value} bytes`;
            case value < 1000000: return `${Math.round(value / 100) / 10} kb`;
            case value < 1000000000: return `${Math.round(value / 100000) / 10} mb`;
            case value < 1000000000000: return `${Math.round(value / 100000000) / 10} gb`;
            case value < 1000000000000000: return `${Math.round(value / 100000000) / 10} tb`;

            default: return String(value);
        }
    }

    private sort(a: MediaStat, b: MediaStat, order: "asc" | "desc" = "asc"): number {
        const orderNum = order === "asc" ? -1 : 1;
        if (a.isDir && !b.isDir) return orderNum;
        if (!a.isDir && b.isDir) return -orderNum;
        const aName = a.name.toUpperCase().replace(/_/g, "!");
        const bName = b.name.toUpperCase().replace(/_/g, "!");
        if (aName < bName) return orderNum;
        if (aName > bName) return -orderNum;
        return 0;
    }
}
