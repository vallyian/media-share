import { Request, Response, NextFunction } from "express";

import { responder } from "../responder";
import * as dirService from "../services/dir.service";
import * as htmlService from "../services/html.service";

export function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestPath = req.path;
    const html = Promise.resolve()
        .then(() => dirService.dirIndex(requestPath))
        .then(items => htmlService.html(items));
    return responder(res, next, html);
}
