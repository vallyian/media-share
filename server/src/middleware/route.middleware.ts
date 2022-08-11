import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { FileResponse } from "../@types/FileResponse";
import * as fsService from "../services/fs.service";
import * as videoService from "../services/video.service";
import * as subtitleService from "../services/subtitle.service";
import * as renderService from "../services/render.service";
import { requestQueryParam } from "../services/sanitizer.service";

type DecodedPaths = {
    relative: string;
    media: string;
}

// TODO: req.* sanitizer service

export async function routeMiddleware(req: Request, res: Response, next: NextFunction) {
    const decodedPaths = decodePaths(req.path);

    const isDir = await fsService.dirExists(decodedPaths.media);
    if (isDir)
        return dirIndexResponse(decodedPaths, res, next);

    const isFile = await fsService.fileExists(decodedPaths.media);
    const fileExtension = path.extname(decodedPaths.relative).toLowerCase();

    let fileHandler: (() => Promise<FileResponse | undefined>) | undefined = undefined;
    switch (true) {
        case fileExtension === ".mp4" && isFile && requestQueryParam(req, "static") !== "true":
            fileHandler = () => videoService.viewData(decodedPaths.media, decodedPaths.relative, fileExtension);
            break;
        case fileExtension === ".vtt" && requestQueryParam(req, "static") !== "true":
            fileHandler = () => subtitleService.viewData(decodedPaths.media, requestQueryParam(req, "video"));
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
        return res.sendFile(decodedPaths.media, {
            root: process.cwd(),
            dotfiles: "allow"
        });

    return next();
}

function dirIndexResponse(decodedPaths: DecodedPaths, res: Response, next: NextFunction) {
    return Promise.resolve()
        .then(() => fsService.readDir(decodedPaths.relative, decodedPaths.media))
        .then(items => renderService.renderPage("dir-index", {
            pills: fsService.pathLinks(decodedPaths.media),
            items
        }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => next(err));
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
