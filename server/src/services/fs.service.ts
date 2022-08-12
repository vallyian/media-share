import fs from "node:fs";
import path from "node:path";

import { ItemStat } from "../@types/ItemStat";

type PathLink = {
    name: string;
    link: string;
}

export function dirExists(dirPath: string): Promise<boolean> {
    return Promise.resolve()
        .then(() => fs.promises.stat(dirPath))
        .then(stat => stat.isDirectory())
        .catch(() => false);
}

export function fileExists(filePath: string): Promise<boolean> {
    return Promise.resolve()
        .then(() => fs.promises.stat(filePath))
        .then(stat => stat.isFile())
        .catch(() => false);
}

export function readDir(relativePath: string, mediaPath: string): Promise<ItemStat[]> {
    let items: string[];
    return Promise.resolve()
        .then(() => fs.promises.readdir(mediaPath))
        .then(i => {
            items = i;
            return Promise.all(items.map(item => fs.promises.stat(path.join(mediaPath, item))));
        })
        .then(stats => stats.map((stat, statIndex) => {
            const isDir = stat.isDirectory();
            return (<ItemStat>{
                parent: relativePath,
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
        const aName = a.name.toUpperCase();
        const bName = b.name.toUpperCase();
        if (aName < bName) return order;
        if (aName > bName) return -order;
        return 0;
    });
}
