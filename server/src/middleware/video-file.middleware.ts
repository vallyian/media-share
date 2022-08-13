import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import * as videoService from "../services/video.service";

export function videoFileMiddleware(req: Request, res: Response, next: NextFunction) {
    const _req = <AppRequest>req;

    return _req.stat !== "file" || _req.isStatic || !videoService.videoExtensionsRx.test(_req.mediaPath)
        ? next()
        : Promise.resolve()
            .then(() => videoService.viewData(_req.mediaPath, _req.relativePath))
            .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
            .catch(err => next(err));
}
