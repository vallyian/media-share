import { MediaAccessAPI } from "../ports/API/MediaAccess.API";
import { MediaStorageSPI } from "../ports/SPI/MediaStorage.SPI";
import { PathLink } from "../objects/PathLink";
import { MediaStat } from "../objects/MediaStat";
import { MediaType } from "../objects/MediaType";
import { Domain } from "..";

export class MediaAccessService implements MediaAccessAPI {
    constructor(
        private mediaStorageAdapter: MediaStorageSPI,
        private readonly config: {
            mediaDir: string,
        }
    ) { }

    /** @inheritdoc */
    parsePath(insecurePath: string) {
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
    async type(insecurePath: string) {
        if (typeof insecurePath !== "string" || insecurePath === "")
            return <MediaType>"error";

        const secureMediaPath = this.getSecureMediaPath(insecurePath);

        return this.mediaStorageAdapter.type(secureMediaPath)
            .catch(() => <MediaType>"error");
    }

    /** @inheritdoc */
    async listDir(insecurePath: string, baseUrl?: string) {
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
                link: `${secureUrl ? "/" : ""}${secureUrl}/${encodeURIComponent(s.name)}`
            }))
            .sort((a, b) => this.sort(a, b));

        return linkMediaStats;
    }

    /** @inheritdoc */
    async getFile(insecurePath: string) {
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
    supportedAudioExtension(insecurePath: string) {
        const extension = this.parsePath(insecurePath).extension;
        const isSupported = Domain.supportedAudios.includes(extension);
        return isSupported ? extension : undefined;
    }

    /** @inheritdoc */
    supportedVideoExtension(insecurePath: string) {
        const extension = this.parsePath(insecurePath).extension;
        const isSupported = Domain.supportedVideos.includes(extension);
        return isSupported ? extension : undefined;
    }

    /** @inheritdoc */
    supportedSubtitleExtension(insecurePath: string) {
        const extension = this.parsePath(insecurePath).extension;
        const isSupported = Domain.supportedSubtitles.includes(extension);
        return isSupported ? extension : undefined;
    }

    /** @inheritdoc */
    pathLinks(insecurePath: string, baseUrl?: string) {
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
    getSecureUrl(insecurePath: string, baseUrl?: string) {
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
