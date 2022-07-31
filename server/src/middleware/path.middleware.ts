import path from "node:path";

import { NextFunction, Response } from "express";

import { Request } from "../../@types/Request";
import { env } from "../env";

export function pathMiddleware(req: Request, _res: Response, next: NextFunction) {
    const requestPath = req.path;
    req.relativePath = /^[\\/]$/g.test(requestPath) ? "" : decodeURIComponent(requestPath);
    req.absolutePath = path.normalize(req.relativePath === "" ? env.MEDIA_DIR : path.join(env.MEDIA_DIR, req.relativePath));
    return next();
}
