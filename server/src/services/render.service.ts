import ejs from "ejs";

import { FileResponse } from "../@types/FileResponse";
import { env } from "../env";
import { routes } from "../routes";
import * as fsService from "./fs.service";

export function renderPage(name: string, data?: Record<string, unknown>): Promise<FileResponse> {
    const indexPath = `${env.VIEWS_DIR}/index.ejs`;
    const pagePath = `${env.VIEWS_DIR}/pages/${name}.ejs`;
    const scriptPath = `${env.VIEWS_DIR}/scripts/${name}.js`;
    return Promise.resolve()
        .then(() => fsService.fileExists(indexPath) || Promise.reject(`index path "${indexPath}" not found`))
        .then(() => fsService.fileExists(pagePath) || Promise.reject(`page path "${pagePath}" not found`))
        .then(() => fsService.fileExists(scriptPath))
        .then(script => ejs.renderFile(indexPath, {
            page: name,
            ...(script ? ({ script: routes.appScripts.replace(":script", `${name}.js`) }) : ({})),
            ...data
        }))
        .then(data => data !== indexPath ? data : Promise.reject("view not rendered"))
        .then(data => ({ mime: "text/html", data }));
}

export function renderIcon(name: string, data?: Record<string, unknown>): Promise<FileResponse> {
    const iconPath = `${env.VIEWS_DIR}/icons/${name}.ejs`;
    return Promise.resolve()
        .then(() => fsService.fileExists(iconPath) || Promise.reject(`icon path "${iconPath}" not found`))
        .then(() => ejs.renderFile(iconPath, data))
        .then(data => data !== iconPath ? data : Promise.reject("icon not rendered"))
        .then(data => ({ mime: "image/svg+xml", data }));
}
