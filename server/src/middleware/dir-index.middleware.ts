import path from "node:path";
import express from "express";
import consts from "../consts";
import fsService from "../services/fs.service";

export default dirIndexMiddleware;

async function dirIndexMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const dirPath = req.path === "" ? consts.mediaDir : path.join(consts.mediaDir, path.normalize(decodeURIComponent(req.path)));
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
