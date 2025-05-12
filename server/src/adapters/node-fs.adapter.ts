import fs from "node:fs";
import path from "node:path";
import { MediaStorageSPI } from "../domain/ports/SPI/MediaStorage.SPI";

export const nodeFsAdapter: MediaStorageSPI = {
    join: (...parts: string[]) => path.join(...parts),
    readDir: (itemPath: string, showDirSizes?: boolean) => Promise.resolve({ itemPath, showDirSizes }).then(toValidType("dir")).then(getDirItems).then(getStats),
    readFile: (itemPath: string) => Promise.resolve({ itemPath }).then(toValidType("file")).then(getFileContent),
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
    } catch {
        return "error";
    }
}

function toValidType(mediaType: Awaited<ReturnType<typeof type>>) {
    return (opts: { itemPath: string, showDirSizes?: boolean | undefined }) => type(opts.itemPath).then(t => t === mediaType
        ? Promise.resolve(opts)
        : Promise.reject(Error(`path not found or not of type "${mediaType}"`)));
}

function getDirItems(opts: { itemPath: string, showDirSizes?: boolean | undefined }) {
    return fs.promises.readdir(opts.itemPath).then(items => ({
        items: items.map(item => path.join(opts.itemPath, item)),
        showDirSizes: opts.showDirSizes
    }));
}

async function getStat(itemPath: string, showDirSizes?: boolean) {
    const stat = await fs.promises.stat(itemPath);
    const isDir = stat.isDirectory();
    const size = isDir && showDirSizes ? await getDirSize(itemPath) : stat.size;
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

function getStats(opts: { items: string[], showDirSizes?: boolean | undefined }) {
    return Promise.allSettled(opts.items.map(itemPath => getStat(itemPath, opts.showDirSizes)))
        .then(stats => stats.map((stat, sx) => stat.status === "fulfilled"
            ? stat.value
            : { name: opts.items[sx]!, size: 0, time: 0, isDir: false }
        ));
}

function getFileContent(opts: { itemPath: string, showDirSizes?: boolean | undefined }) {
    return fs.promises.readFile(opts.itemPath);
}
