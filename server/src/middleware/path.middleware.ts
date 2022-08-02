import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";

export function pathMiddleware(req: Request | AppRequest, _res: Response, next: NextFunction) {
    const relativePath: keyof AppRequest = "relativePath";
    Object.defineProperty(req, relativePath, {
        value: /^[\\/]$/g.test(req.path)
            ? ""
            : decodeURIComponent(req.path),
        writable: false
    });

    const mediaPath: keyof AppRequest = "mediaPath";
    Object.defineProperty(req, mediaPath, {
        value: path.normalize((<AppRequest>req).relativePath === ""
            ? "media"
            : path.join("media", (<AppRequest>req).relativePath)),
        writable: false
    });

    return next();
}
