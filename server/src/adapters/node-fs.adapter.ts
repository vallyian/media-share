import fs from "node:fs";
import path from "node:path";
import { MediaStorageSPI } from "../domain/ports/SPI/MediaStorage.SPI";

export class NodeFsAdapter implements MediaStorageSPI {
    /** @inheritdoc */
    join = (...parts: string[]) => path.join(...parts);

    /** @inheritdoc */
    async readDir(dirPath: string) {
        if (await this.type(dirPath) !== "dir")
            throw Error(`path "${dirPath}" not a dir or not found`);

        const items = await fs.promises.readdir(dirPath);
        const stats = await Promise.all(items.map(item => fs.promises.stat(path.join(dirPath, item))));

        return stats.map((stat, index) => ({
            name: <string>items[index],
            size: stat.size,
            time: Math.max(stat.ctimeMs, stat.mtimeMs),
            isDir: stat.isDirectory()
        }));
    }

    /** @inheritdoc */
    async readFile(filePath: string) {
        if (await this.type(filePath) !== "file")
            throw Error(`path "${filePath}" not a file or not found`);
        const data = await fs.promises.readFile(filePath);
        return data;
    }

    /** @inheritdoc */
    async type(itemPath: string) {
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
}
