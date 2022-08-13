import ejs from "ejs";

import { FileResponse } from "../@types/FileResponse";
import { env } from "../env";
import * as fsService from "./fs.service";

export function renderPage(name: string, data?: Record<string, unknown>): Promise<FileResponse> {
    const indexPath = `${env.VIEWS_DIR}/index.ejs`;
    const pagePath = `${env.VIEWS_DIR}/pages/${name}.ejs`;
    return Promise.resolve()
        .then(() => Promise.all([
            fsService.stat(indexPath),
            fsService.stat(pagePath)
        ]))
        .then(([indexStat, pageStat]) => {
            indexStat === "file" || Promise.reject(`index view "${indexPath}" not found`);
            pageStat === "file" || Promise.reject(`page view "${pagePath}" not found`);
            return ejs.renderFile(indexPath, {
                page: name,
                ...data
            });
        })
        .then(data => data !== indexPath ? data : Promise.reject("view not rendered"))
        .then(data => ({ mime: "text/html", data }));
}

export function renderIcon(name: string, data?: Record<string, unknown>): Promise<FileResponse> {
    const iconPath = `${env.VIEWS_DIR}/icons/${name}.ejs`;
    return Promise.resolve()
        .then(() => fsService.stat(iconPath))
        .then(stat => stat === "file" || Promise.reject(`icon path "${iconPath}" not found`))
        .then(() => ejs.renderFile(iconPath, data))
        .then(data => data !== iconPath ? data : Promise.reject("icon not rendered"))
        .then(data => ({ mime: "image/svg+xml", data }));
}
