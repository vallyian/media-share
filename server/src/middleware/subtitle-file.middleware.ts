import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import * as subtitleService from "../services/subtitle.service";
import * as sanitizeService from "../services/sanitize.service";

export function subtitleFileMiddleware(req: Request, res: Response, next: NextFunction) {
    const _req = <AppRequest>req;

    return _req.stat === "file" || !/\.vtt$/i.test(_req.mediaPath)
        ? next()
        : Promise.resolve()
            .then(() => subtitleService.viewData(_req.mediaPath, sanitizeService.queryParams(req).video))
            .then(({ mime, data }) => res.setHeader("Content-type", mime).end(data))
            .catch(err => {
                if (err.message === "subtitle not found")
                    err.status = 404;
                return next(err);
            });
}
