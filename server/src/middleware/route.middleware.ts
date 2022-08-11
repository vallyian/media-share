import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { FileResponse } from "../@types/FileResponse";
import { DecodedPath } from "../@types/DecodedPath";
import * as fsService from "../services/fs.service";
import * as videoService from "../services/video.service";
import * as subtitleService from "../services/subtitle.service";
import * as renderService from "../services/render.service";
import { sanitizeStatict, sanitizeVideo } from "../services/sanitizer.service";

// TODO: req.* sanitizer service

export async function routeMiddleware(req: Request, res: Response, next: NextFunction) {
    const decodedPath = fsService.decodePath(req.path);

    const isDir = await fsService.dirExists(decodedPath.media);
    if (isDir)
        return dirIndexResponse(decodedPath, res, next);

    const isFile = await fsService.fileExists(decodedPath.media);
    const fileExtension = path.extname(decodedPath.relative).toLowerCase();

    let fileHandler: (() => Promise<FileResponse | undefined>) | undefined = undefined;
    switch (true) {
        case fileExtension === ".mp4" && isFile && !sanitizeStatict(req.params["static"]):
            fileHandler = () => videoService.viewData(decodedPath.media, decodedPath.relative, fileExtension);
            break;
        case fileExtension === ".vtt" && !sanitizeStatict(req.params["static"]):
            fileHandler = () => subtitleService.viewData(decodedPath.media, sanitizeVideo(req.params["video"]));
            break;
        default:
            break;
    }
    if (fileHandler) {
        const fileHandlerResult = await Promise.resolve().then(() => fileHandler?.())
            .catch(() => undefined);
        if (fileHandlerResult && fileHandlerResult.mime && fileHandlerResult.data)
            return res.setHeader("Content-type", fileHandlerResult.mime).end(fileHandlerResult.data);
    }

    if (isFile)
        return res.sendFile(decodedPath.media, {
            root: process.cwd(),
            dotfiles: "allow"
        });

    return next();
}

function dirIndexResponse(decodedPaths: DecodedPath, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => fsService.readDir(decodedPaths.relative, decodedPaths.media))
        .then(items => renderService.renderPage("dir-index", {
            pills: fsService.pathLinks(decodedPaths.media),
            items
        }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => next(err));
}
