import { Response, NextFunction } from "express";

import { Request } from "../../@types/Request";
import { responder } from "../responder";
import * as dirService from "../services/dir.service";
import * as htmlService from "../services/html.service";

export async function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const dirStat = await dirService.statDir(req.absolutePath)
        .catch(() => false);

    if (!dirStat)
        return next();

    const html = Promise.resolve()
        .then(() => dirService.dirIndex(req.relativePath, req.absolutePath))
        .then(items => htmlService.html(items))
        .catch(err => err);

    return responder(res, next, html);
}
