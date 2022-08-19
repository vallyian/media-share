import path from "node:path";
import express from "express";
import { AppError } from "../@types/AppError";
import consts from "../consts";
import fsService from "../services/fs.service";

export default videoFileMiddleware;

async function videoFileMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let videoPath = path.normalize(decodeURIComponent(req.path));
    if (!consts.supportedVideosRx.test(videoPath) || req.query["static"] === "true")
        return next();

    videoPath = path.join(consts.mediaDir, videoPath);
    if (await fsService.stat(videoPath) !== "file") {
        const err: AppError = Error("not found");
        err.status = 404;
        return next(err);
    }

    return Promise.resolve()
        .then(() => viewData(videoPath))
        .then(data => res.render("index", { page: "video", ...data }))
        .catch(err => next(err));
}

async function viewData(videoPath: string): Promise<Record<string, unknown>> {
    const dir = path.dirname(videoPath);
    const file = path.basename(videoPath);
    const ext = path.extname(videoPath);
    const fileNameNoExtRx = new RegExp("^" + file.replace(new RegExp(`${ext}$`, "i"), ""), "i");
    const files = await fsService.readDir(dir);
    const videos = files.filter(s => consts.supportedVideosRx.test(s.name));
    const videoIndex = videos.findIndex(s => s.name === file);
    const pathLinks = fsService.pathLinks(videoPath);
    const urlPath = fsService.urlPath(videoPath.replace(/\\/g, "/").replace(new RegExp(`^${consts.mediaDir}/`), ""));
    const urlDir = urlPath.replace(new RegExp(`${encodeURIComponent(file)}$`, "i"), "");
    const subtitles = files.filter(s => consts.supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name));
    const subParams = (name: string) => /\.vtt$/i.test(name) ? "static=true" : /\.sub$/i.test(name) ? `video=${ext.replace(".", "")}` : "";
    return {
        pills: pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 2) : pathLinks,
        urlPath: `${urlPath}?static=true`,
        subtitles: subtitles.map(({ name }) => ({ name, path: `${urlDir}/${name}?${subParams(name)}` })),
        mimeType: ext.replace(/^\./, "video/"),
        prev: videos[videoIndex - 1]?.name ? `${urlDir}/${<string>videos[videoIndex - 1]?.name}` : "",
        next: videos[videoIndex + 1]?.name ? `${urlDir}/${<string>videos[videoIndex + 1]?.name}` : ""
    };
}