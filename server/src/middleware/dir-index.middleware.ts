import path from "node:path";
import express from "express";
import consts from "../consts";
import fsService from "../services/fs.service";

export default dirIndexMiddleware;

async function dirIndexMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const dirPath = req.path === "" ? consts.mediaDir : path.join(consts.mediaDir, fsService.secNormalize(decodeURIComponent(req.path)));
    if (await fsService.stat(dirPath) !== "dir")
        return next();

    return Promise.resolve()
        .then(() => fsService.readDir(dirPath, req.baseUrl))
        .then(items => res.render("index", {
            baseUrl: req.baseUrl,
            page: "dir-index",
            pills: fsService.pathLinks(dirPath, req.baseUrl),
            items
        }))
        .catch(err => next(err));
}
