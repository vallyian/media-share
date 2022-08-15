import fs from "node:fs";
import path from "node:path";

import { Stat } from "../@types/AppRequest";
import { ItemStat } from "../@types/ItemStat";

type PathLink = {
    name: string;
    link: string;
}

export function stat(itemPath: string): Promise<Stat> {
    return Promise.resolve()
        .then(() => typeof itemPath === "string" && !!itemPath || Promise.reject())
        .then(() => fs.promises.stat(itemPath))
        .then(stat => {
            if (stat.isDirectory()) return "dir";
            if (stat.isFile()) return "file";
            return "unknown";
        })
        .catch(() => "error");
}

export function readFile(filePath: string): Promise<Buffer> {
    return Promise.resolve()
        .then(() => stat(filePath))
        .then(stat => stat === "file" || Promise.reject(""))
        .then(() => fs.promises.readFile(filePath));
}

export function tryReadFileSync(filePaths: string[]): Buffer | undefined {
    for (const filePath of filePaths)
        if (statSync(filePath) === "file") return fs.readFileSync(filePath);
    return;
}

export function readDir(mediaDir: string, relativeDir: string): Promise<ItemStat[]> {
    let items: string[];
    return Promise.resolve()
        .then(() => fs.promises.readdir(mediaDir))
        .then(i => {
            items = i;
            return Promise.all(items.map(item => fs.promises.stat(path.join(mediaDir, item))));
        })
        .then(stats => stats.map((stat, statIndex) => {
            const isDir = stat.isDirectory();
            return (<ItemStat>{
                parent: relativeDir,
                name: items[statIndex],
                size: isDir ? "" : size(stat.size),
                isDir: isDir || undefined
            });
        }))
        .then(items => sort(items));
}

export function pathLinks(mediaPath: string): PathLink[] {
    const parts = mediaPath.split(path.sep);

    const pills = [];

    let link = "";
    pills.push({ name: <string>parts.shift(), link: "/" });
    for (const name of parts) {
        link += `/${encodeURIComponent(name)}`;
        pills.push({ name, link });
    }

    return pills;
}

function statSync(dirPath: string): Stat {
    try {
        const stat = fs.statSync(dirPath);
        if (stat.isDirectory()) return "dir";
        if (stat.isFile()) return "file";
        return "unknown";
    } catch (_err) {
        return "error";
    }
}

function size(value: number): string {
    switch (true) {
        case value < 1000: return `${value} bytes`;
        case value < 1000000: return `${Math.round(value / 100) / 10} kb`;
        case value < 1000000000: return `${Math.round(value / 100000) / 10} mb`;
        case value < 1000000000000: return `${Math.round(value / 100000000) / 10} gb`;
        case value < 1000000000000000: return `${Math.round(value / 100000000) / 10} tb`;

        default: return String(value);
    }
}

function sort(items: ItemStat[], asc = true): ItemStat[] {
    const order = asc ? -1 : 1;
    return items.sort((a: ItemStat, b: ItemStat) => {
        if (a.isDir && !b.isDir) return order;
        if (!a.isDir && b.isDir) return -order;
        const aName = a.name.toUpperCase().replace(/_/g, "!");
        const bName = b.name.toUpperCase().replace(/_/g, "!");
        if (aName < bName) return order;
        if (aName > bName) return -order;
        return 0;
    });
}
