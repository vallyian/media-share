import { Response, NextFunction, Request } from "express";

import { AppRequest } from "../@types/AppRequest";
import * as dirService from "../services/dir.service";

export async function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    const dirStat = await dirService.statDir(request.absolutePath)
        .catch(() => false);

    if (!dirStat)
        return next();

    return Promise.resolve()
        .then(() => dirService.dirIndex(request.relativePath, request.absolutePath))
        .then(items => items instanceof Error
            ? next(items)
            : res.render("index", { page: "dir-index", items }))
        .catch(err => next(err));
}
