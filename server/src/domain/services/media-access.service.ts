import { MediaAccessAPI } from "../ports/API/MediaAccess.API";
import { MediaStorageSPI } from "../ports/SPI/MediaStorage.SPI";
import { PathLink } from "../objects/PathLink";
import { MediaStat } from "../objects/MediaStat";
import { MediaType } from "../objects/MediaType";
import * as domain from "..";

export function mediaAccessService(mediaStorageAdapter: MediaStorageSPI, config: { mediaDir: string }): MediaAccessAPI {
    return {
        parsePath: parsePath(mediaStorageAdapter, config.mediaDir),
        type: type(mediaStorageAdapter, config.mediaDir),
        listDir: listDir(mediaStorageAdapter, config.mediaDir),
        getFile: getFile(mediaStorageAdapter, config.mediaDir),
        supportedAudioExtension: supportedAudioExtension(mediaStorageAdapter, config.mediaDir),
        supportedVideoExtension: supportedVideoExtension(mediaStorageAdapter, config.mediaDir),
        supportedSubtitleExtension: supportedSubtitleExtension(mediaStorageAdapter, config.mediaDir),
        pathLinks,
        getSecureUrl
    };
}

function parsePath(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    return (insecurePath: string) => {
        const securePathSegments = getSecurePathSegments(insecurePath);
        const secureMediaPath = mediaStorageAdapter.join(mediaDir, ...securePathSegments);
        const secureParentDir = mediaStorageAdapter.join(...securePathSegments.slice(0, -1));
        const secureName = securePathSegments.length >= 1
            ? <string>securePathSegments[securePathSegments.length - 1]
            : "";
        const secureNameDotSegments = secureName.split(/\./g);
        const secureExtension = secureNameDotSegments.length >= 2
            ? <string>secureNameDotSegments[secureNameDotSegments.length - 1]
            : "";

        return {
            mediaPath: secureMediaPath,
            parent: secureParentDir,
            name: secureName,
            extension: secureExtension
        };
    };
}

function type(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const toSecureMediaPath = getSecureMediaPath(mediaStorageAdapter, mediaDir);
    const toMediaType = mediaStorageAdapter.type;
    const toMediaErrorType = () => <MediaType>"error";

    return (insecurePath: string) => Promise.resolve(insecurePath)
        .then(toValidString)
        .then(toSecureMediaPath)
        .then(toMediaType)
        .catch(toMediaErrorType);
}

function listDir(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const toValidDirType = toValidType(mediaStorageAdapter, mediaDir)("dir");
    const toSecureMediaPath = getSecureMediaPath(mediaStorageAdapter, mediaDir);
    const toMediaStats = mediaStorageAdapter.readDir;
    const toLinkMediaStats = (mediaStats: Awaited<ReturnType<typeof toMediaStats>>, url: string) => mediaStats
        .map(s => ({
            ...s,
            link: `${url ? "/" : ""}${url}/${encodeURIComponent(s.name)}`
        }))
        .sort((a, b) => sort(a, b));

    return async (insecurePath: string, baseUrl?: string) => Promise.resolve(insecurePath)
        .then(toValidString)
        .then(toValidDirType)
        .then(toSecureMediaPath)
        .then(toMediaStats)
        .then(mediaStats => ({ mediaStats, secureUrl: getSecureUrl(insecurePath, baseUrl) }))
        .then(({ mediaStats, secureUrl }) => toLinkMediaStats(mediaStats, secureUrl));
}

function getFile(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const toValidFileType = toValidType(mediaStorageAdapter, mediaDir)("file");
    const toSecureMediaPath = getSecureMediaPath(mediaStorageAdapter, mediaDir);
    const toFileContent = mediaStorageAdapter.readFile;

    return (insecurePath: string) => Promise.resolve(insecurePath)
        .then(toValidString)
        .then(toValidFileType)
        .then(toSecureMediaPath)
        .then(toFileContent);
}

function supportedAudioExtension(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const toParsedPath = parsePath(mediaStorageAdapter, mediaDir);
    return (insecurePath: string) => {
        const { extension } = toParsedPath(insecurePath);
        const isSupported = domain.supportedAudios.includes(extension);
        return isSupported ? extension : undefined;
    };
}

function supportedVideoExtension(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const pathParser = parsePath(mediaStorageAdapter, mediaDir);
    return (insecurePath: string) => {
        const { extension } = pathParser(insecurePath);
        const isSupported = domain.supportedVideos.includes(extension);
        return isSupported ? extension : undefined;
    };
}

function supportedSubtitleExtension(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const pathParser = parsePath(mediaStorageAdapter, mediaDir);
    return (insecurePath: string) => {
        const { extension } = pathParser(insecurePath);
        const isSupported = domain.supportedSubtitles.includes(extension);
        return isSupported ? extension : undefined;
    };
}

function pathLinks(insecurePath: string, baseUrl?: string) {
    if (typeof insecurePath !== "string" || insecurePath === "")
        throw Error("invalid item path");

    const securePathSegments = getSecurePathSegments(insecurePath);
    const secureBaseUrl = baseUrl ? getSecureUrl(baseUrl) : "";
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

function getSecureUrl(insecurePath: string, baseUrl?: string) {
    const secureUrl = getSecurePathSegments(insecurePath, baseUrl)
        .map(u => encodeURIComponent(u))
        .join("/");
    return secureUrl;
}

function getSecurePath(mediaStorageAdapter: MediaStorageSPI) {
    return (insecurePath: string, baseUrl?: string) => {
        const securePathSegments = getSecurePathSegments(insecurePath, baseUrl);
        const securePath = mediaStorageAdapter.join(...securePathSegments);
        return securePath;
    };
}

function getSecureMediaPath(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const pathSecurer = getSecurePath(mediaStorageAdapter);
    return (insecurePath: string, baseUrl?: string) => {
        const securePath = pathSecurer(insecurePath, baseUrl);
        const secureMediaPath = mediaStorageAdapter.join(mediaDir, securePath);
        return secureMediaPath;
    };
}

function getSecurePathSegments(insecurePath: string, insecurePathPrefix?: string) {
    const getSecureSegments = (path: string) =>
        path.split(/[\\/]/g).map(s => decodeURIComponent(s)).filter(p => !!p && p !== "." && p != "..");
    const arr = (insecurePathPrefix ? getSecureSegments(insecurePathPrefix) : [])
        .concat(getSecureSegments(insecurePath));
    return arr;
}

function sort(a: MediaStat, b: MediaStat, order: "asc" | "desc" = "asc"): number {
    const orderNum = order === "asc" ? -1 : 1;
    if (a.isDir && !b.isDir) return orderNum;
    if (!a.isDir && b.isDir) return -orderNum;
    const aName = a.name.toUpperCase().replace(/_/g, "!");
    const bName = b.name.toUpperCase().replace(/_/g, "!");
    if (aName < bName) return orderNum;
    if (aName > bName) return -orderNum;
    return 0;
}

function toValidString(path: string) {
    return typeof path === "string" && path !== ""
        ? Promise.resolve(path)
        : Promise.reject("invalid path arg");
}

function toValidType(mediaStorageAdapter: MediaStorageSPI, mediaDir: string) {
    const toMediaType = type(mediaStorageAdapter, mediaDir);
    return (mediaType: Awaited<ReturnType<typeof mediaStorageAdapter.type>>) =>
        (path: string) =>
            toMediaType(path).then(type => type === mediaType
                ? Promise.resolve(path)
                : Promise.reject(`path not found or not of type "${mediaType}"`));
}
