import fs from "node:fs";
import path from "node:path";
import consts from "../consts";

export default {
    stat,
    readFile,
    readFileSync,
    urlPath,
    readDir,
    pathLinks
};

type Stat = "file" | "dir" | "error" | "unknown";

type ItemStat = {
    urlDir: string,
    name: string,
    size: number | string,
    isDir?: boolean
}

type PathLink = {
    name: string;
    link: string;
}

async function stat(itemPath: string): Promise<Stat> {
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

function statSync(itemPath: string): Stat {
    if (typeof itemPath !== "string" || itemPath === "") return "error";
    try {
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) return "dir";
        if (stat.isFile()) return "file";
        return "unknown";
    } catch (_err) {
        return "error";
    }
}

async function readFile(filePath: string): Promise<Buffer> {
    if (await stat(filePath) !== "file") throw Error(`path "${filePath}" not a file or not found`);
    const data = await fs.promises.readFile(filePath);
    return data;
}

function readFileSync(filePaths: string[]): Buffer | undefined {
    for (const filePath of filePaths)
        if (statSync(filePath) === "file")
            return fs.readFileSync(filePath);
    return;
}

function urlPath(fsPath: string) {
    return String(fsPath)
        .replace(/\\/g, "/")
        .replace(new RegExp(`^${consts.mediaDir}/`), "")
        .replace(/\/$/, "")
        .split("/").map(u => encodeURIComponent(u))
        .join("/");
}

async function readDir(dirPath: string, sort: "asc" | "desc" = "asc"): Promise<ItemStat[]> {
    if (await stat(dirPath) !== "dir") throw Error(`path "${dirPath}" not a dir or not found`);

    const items = await fs.promises.readdir(dirPath);
    const stats = await Promise.all(items.map(item => fs.promises.stat(path.join(dirPath, item))));
    const urlDir = urlPath(dirPath);

    const order = sort === "asc" ? -1 : 1;

    return stats.map((stat, statIndex) => {
        const isDir = stat.isDirectory();
        return (<ItemStat>{
            urlDir,
            name: items[statIndex],
            size: isDir ? "" : size(stat.size),
            isDir: isDir || undefined
        });
    }).sort((a, b) => sorter(a, b, order));
}

function pathLinks(mediaPath: string): PathLink[] {
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

function sorter(a: ItemStat, b: ItemStat, order: -1 | 1) {
    if (a.isDir && !b.isDir) return order;
    if (!a.isDir && b.isDir) return -order;
    const aName = a.name.toUpperCase().replace(/_/g, "!");
    const bName = b.name.toUpperCase().replace(/_/g, "!");
    if (aName < bName) return order;
    if (aName > bName) return -order;
    return 0;
}
