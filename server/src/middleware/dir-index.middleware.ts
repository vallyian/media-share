import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import * as fsService from "../services/fs.service";
import * as renderService from "../services/render.service";

export function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const _req = <AppRequest>req;
    if (_req.stat !== "dir")
        return next();

    return Promise.resolve()
        .then(() => fsService.readDir(_req.mediaPath, _req.relativePath))
        .then(items => renderService.renderPage("dir-index", {
            pills: fsService.pathLinks(_req.mediaPath),
            items
        }))
        .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
        .catch(err => next(err));
}
