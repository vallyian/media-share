import path from "node:path";

import { NextFunction, Request, Response } from "express";
import ejs from "ejs";

import { FileResponse } from "../@types/FileResponse";
import * as fsService from "../services/fs.service";
import * as videoService from "../services/video.service";
import * as subtitleService from "../services/subtitle.service";
import { routes } from "../routes";
import { globals } from "../globals";
import { env } from "../env";

type DecodedPaths = {
    relative: string;
    media: string;
}

export async function routeMiddleware(req: Request, res: Response, next: NextFunction) {
    const decodedPaths = decodePaths(req.path);

    const isDir = await fsService.dirExists(decodedPaths.media);
    if (isDir)
        return dirIndexResponse(decodedPaths, res, next);

    let isFile = await fsService.fileExists(decodedPaths.media);
    const fileExtension = path.extname(decodedPaths.relative).toLowerCase();

    let fileHandler: Promise<FileResponse | undefined> | FileResponse | undefined = undefined;
    switch (true) {
        case fileExtension === ".mp4" && isFile && !req.query["static"]:
            fileHandler = videoService.viewData(decodedPaths.media, decodedPaths.relative, fileExtension);
            break;
        case fileExtension === ".vtt" && !req.query["static"]:
            fileHandler = subtitleService.viewData(decodedPaths.media, <string | undefined>req.query["video"]);
            break;
        case req.path === routes.favicon:
            fileHandler = favicon();
            break;
        default:
            break;
    }
    if (fileHandler instanceof Promise)
        fileHandler = await fileHandler;

    if (fileHandler && fileHandler.mime && fileHandler.data)
        return res.setHeader("Content-type", fileHandler.mime).end(fileHandler.data);

    if (!isFile) {
        const scriptFileNameRx = new RegExp(`^${routes.appScripts}/([a-z-]+.js)$`);
        const scriptFileName = req.path.match(scriptFileNameRx);
        decodedPaths.media = scriptFileName && scriptFileName[1]
            ? path.join(...((env.NODE_ENV === "development" ? ["src"] : []).concat(["views", "scripts", scriptFileName[1]])))
            : "";
        isFile = decodedPaths.media !== "" && await fsService.fileExists(decodedPaths.media);
    }

    if (isFile)
        return res.sendFile(decodedPaths.media, {
            root: globals.process.cwd(),
            dotfiles: "allow"
        });

    return next();
}

function dirIndexResponse(decodedPaths: DecodedPaths, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => fsService.readDir(decodedPaths.relative, decodedPaths.media))
        .then(items => items instanceof Error
            ? next(items)
            : res.render("index", {
                page: "dir-index",
                pills: fsService.pathLinks(decodedPaths.media),
                items
            }))
        .catch(err => next(err));
}

function favicon(): Promise<FileResponse> {
    const viewPath = `${env.VIEWS_DIR}/icons/share-fill.ejs`;
    return Promise.resolve()
        .then(() => ejs.renderFile(viewPath, { fill: "#0080FF" }))
        .then(data => data !== viewPath ? data : "")
        .then(data => ({
            mime: "image/svg+xml",
            data
        }));
}

function decodePaths(requestPath: string): DecodedPaths {
    const relative = /^[\\/]$/g.test(requestPath)
        ? ""
        : decodeURIComponent(requestPath);
    const media = path.normalize(relative === ""
        ? "media"
        : path.join("media", relative));
    return { relative, media };
}
