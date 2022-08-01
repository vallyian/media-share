import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import { env } from "../env";

export function pathMiddleware(req: Request | AppRequest, _res: Response, next: NextFunction) {
    const request = <AppRequest>req;
    const requestPath = request.path;
    request.relativePath = /^[\\/]$/g.test(requestPath) ? "" : decodeURIComponent(requestPath);
    request.absolutePath = path.normalize(request.relativePath === "" ? env.MEDIA_DIR : path.join(env.MEDIA_DIR, request.relativePath));
    return next();
}
