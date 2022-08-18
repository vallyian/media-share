import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { mediaDir } from "../consts";
import * as fsService from "../services/fs.service";

export async function dirIndexMiddleware(req: Request, res: Response, next: NextFunction) {
    const dirPath = req.path === "" ? mediaDir : path.join(mediaDir, path.normalize(decodeURIComponent(req.path)));
    if (await fsService.stat(dirPath) !== "dir")
        return next();

    return Promise.resolve()
        .then(() => fsService.readDir(dirPath))
        .then(items => res.render("index", {
            page: "dir-index",
            pills: fsService.pathLinks(dirPath),
            items
        }))
        .catch(err => next(err));
}
