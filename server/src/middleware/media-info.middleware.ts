import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import { env } from "../env";
import * as fsService from "../services/fs.service";
import * as sanitizeService from "../services/sanitize.service";

export async function mediaInfoMiddleware(req: Request, _res: Response, next: NextFunction) {
    const _req = <AppRequest>req;

    _req.relativePath = /^[\\/]$/g.test(req.path)
        ? ""
        : decodeURIComponent(req.path);

    _req.mediaPath = path.normalize(_req.relativePath === ""
        ? env.MEDIA_DIR
        : path.join(env.MEDIA_DIR, _req.relativePath));

    _req.stat = await fsService.stat(_req.mediaPath);

    _req.isStatic = sanitizeService.queryParams(req).static;

    next();
}
