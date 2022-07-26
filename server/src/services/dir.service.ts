import assert from "node:assert";
import * as fs from "fs";
import path from "node:path";

import { env } from "../env";

export function dirIndex(dirPath: string): Promise<Error | ItemStat[]> {
    let dirAbsolutePath: string;
    return Promise.resolve()
        .then(() => typeof dirPath !== "string" && assert.fail("dirPath arg invalid"))
        .then(() => dirAbsolutePath = path.normalize(path.join(env.MEDIA_DIR, dirPath)))
        .then(() => fs.promises.stat(dirAbsolutePath).catch(err => err.code === "ENOENT"
            ? assert.fail(`path "${dirPath}" not found`)
            : assert.fail(`path "${dirPath}" not accessible`)))
        .then(stat => !stat.isDirectory() && assert.fail(`dir "${dirPath}" not found`))
        .then(() => dirList(dirAbsolutePath));
}

function dirList(dirPath: string): Promise<ItemStat[]> {
    let items: string[];
    return Promise.resolve()
        .then(() => fs.promises.readdir(dirPath))
        .then(i => items = i.map(item => path.normalize(path.join(dirPath, item))))
        .then(() => Promise.all(items.map(item => fs.promises.stat(item))))
        .then(stats => stats.map((stat, statIndex) => {
            const isDir = stat.isDirectory();
            return (<ItemStat>{
                name: path.basename(items[statIndex]),
                size: isDir ? 0 : size(stat.size),
                isDir: isDir || undefined
            });
        }));
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
