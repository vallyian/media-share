import { Response, NextFunction, Request } from "express";

import { AppRequest } from "../@types/AppRequest";
import { responder } from "../responder";
import * as dirService from "../services/dir.service";
import * as htmlService from "../services/html.service";

export async function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    const dirStat = await dirService.statDir(request.absolutePath)
        .catch(() => false);

    if (!dirStat)
        return next();

    const html = Promise.resolve()
        .then(() => dirService.dirIndex(request.relativePath, request.absolutePath))
        .then(items => htmlService.html(items))
        .catch(err => err);

    return responder(res, next, html);
}
