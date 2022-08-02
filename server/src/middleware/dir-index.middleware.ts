import path from "node:path";

import { Response, NextFunction, Request } from "express";

import { AppRequest } from "../@types/AppRequest";
import * as dirService from "../services/dir.service";

export async function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    const dirStat = await dirService.statDir(request.mediaPath)
        .catch(() => false);

    if (!dirStat)
        return next();

    return Promise.resolve()
        .then(() => dirService.dirIndex(request.relativePath, request.mediaPath))
        .then(items => items instanceof Error
            ? next(items)
            : res.render("index", {
                page: "dir-index",
                pills: getPills(request.mediaPath),
                items
            }))
        .catch(err => next(err));
}

function getPills(mediaPath: string) {
    const parts = mediaPath.split(path.sep);

    const pills = [];

    let link = "";
    pills.push({ name: parts.shift(), link: "/" });
    for (const name of parts) {
        link += `/${encodeURIComponent(name)}`;
        pills.push({ name, link });
    }

    return pills;
}
