import express from "express";
import fsService from "../services/fs.service";

export default mediaSyncRoute;

async function mediaSyncRoute(req: express.Request, res: express.Response) {
    let filePath = "";
    return Promise.resolve()
        .then(() => filePath = decodeURIComponent(new URL(req.get("referer") || "").pathname))
        .then(() => fsService.statRelative(filePath))
        .then(stat => stat === "file" || Promise.reject("referer not a file"))
        .then(() => void 0) // TODO: cluster safe media-sync in memory storage
        .then(() => res.status(200).end())
        .catch(err => {
            console.error(err);
            res.status(400).end();
        });
}
