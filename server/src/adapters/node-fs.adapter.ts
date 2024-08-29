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

async function getStat(itemPath: string) {
    const stat = await fs.promises.stat(itemPath);
    const isDir = stat.isDirectory();
    const size = isDir ? await getDirSize(itemPath) : stat.size;
    return {
        name: path.basename(itemPath),
        size,
        time: Math.max(stat.ctimeMs, stat.mtimeMs),
        isDir
    };
}

async function getDirSize(dirPath: string) {
    let size = 0;

    const addSize = async (itemPath: string) => {
        const stat = await fs.promises.stat(itemPath);
        if (!stat.isDirectory()) {
            size += stat.size;
            return;
        }

        const items = await fs.promises.readdir(itemPath).then(items => items.map(i => path.join(itemPath, i)));
        const stats = await Promise.all(items.map(i => fs.promises.stat(i).catch(() => null)));
        size += stats.reduce((acc, s) => acc + (s?.isDirectory() ? 0 : s?.size ?? 0), 0);
        await Promise.all(items.filter((_, ix) => stats[ix]?.isDirectory()).map(addSize));
    };

    await addSize(dirPath);

    return size;
}

function getStats(items: string[]) {
    return Promise.allSettled(items.map(getStat))
        .then(stats => stats.map((stat, sx) => stat.status === "fulfilled"
            ? stat.value
            : { name: items[sx]!, size: 0, time: 0, isDir: false }
        ));
}

function getFileContent(filePath: string) {
    return fs.promises.readFile(filePath);
}
