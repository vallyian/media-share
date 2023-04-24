import fs from "node:fs";
import path from "node:path";
import { MediaStorageSPI } from "../domain/ports/SPI/MediaStorage.SPI";

export const nodeFsAdapter: MediaStorageSPI = {
    join: (...parts: string[]) => path.join(...parts),
    readDir: (dirPath: string) => Promise.resolve(dirPath).then(toValidType("dir")).then(getDirItems).then(getStats),
    readFile: (filePath: string) => Promise.resolve(filePath).then(toValidType("file")).then(getFileContent),
    type
};

async function type(itemPath: string) {
    if (typeof itemPath !== "string" || itemPath === "")
        return "error";
    try {
        const stat = await fs.promises.stat(itemPath);
        if (stat.isDirectory()) return "dir";
        if (stat.isFile()) return "file";
        return "unknown";
    } catch (_ex) {
        return "error";
    }
}

function toValidType(mediaType: Awaited<ReturnType<typeof type>>) {
    return (path: string) => type(path).then(t => t === mediaType
        ? Promise.resolve(path)
        : Promise.reject(`path not found or not of type "${mediaType}"`));
}

function getDirItems(dirPath: string) {
    return fs.promises.readdir(dirPath).then(items =>
        items.map(item => path.join(dirPath, item))
    );
}

function getStat(filePath: string) {
    return fs.promises.stat(filePath).then(stat => ({
        name: path.basename(filePath),
        size: stat.size,
        time: Math.max(stat.ctimeMs, stat.mtimeMs),
        isDir: stat.isDirectory()
    }));
}

function getStats(items: string[]) {
    return Promise.all(items.map(getStat));
}

function getFileContent(filePath: string) {
    return fs.promises.readFile(filePath);
}
