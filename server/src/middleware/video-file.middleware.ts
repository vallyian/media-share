import path from "node:path";
import express from "express";
import { AppError } from "../@types/AppError";
import config from "../config";
import fsService from "../services/fs.service";

export default videoFileMiddleware;

async function videoFileMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    let videoPath = fsService.secNormalize(decodeURIComponent(req.path));
    if (!config.supportedVideosRx.test(videoPath) || req.query["static"] === "true")
        return next();

    videoPath = path.join(config.mediaDir, videoPath);
    if (await fsService.stat(videoPath) !== "file") {
        const err: AppError = Error("not found");
        err.status = 404;
        return next(err);
    }

    return Promise.resolve()
        .then(() => viewData(videoPath, req.baseUrl))
        .then(data => res.render("index", {
            baseUrl: req.baseUrl,
            page: "video",
            ...data
        }))
        .catch(err => next(err));
}

async function viewData(videoPath: string, baseUrl: string): Promise<Record<string, unknown>> {
    const dir = path.dirname(videoPath);
    const file = path.basename(videoPath);
    const ext = path.extname(videoPath);
    const fileNameNoExt = file.replace(new RegExp(`${ext}$`, "i"), "");
    const fileNameNoExtRx = new RegExp(`^${fileNameNoExt}`, "i");
    const files = await fsService.readDir(dir, baseUrl);
    const videos = files.filter(s => config.supportedVideosRx.test(s.name));
    const videoIndex = videos.findIndex(s => s.name === file);
    const pathLinks = fsService.pathLinks(videoPath, baseUrl);
    const urlPath = fsService.urlPath(videoPath.replace(/\\/g, "/").replace(new RegExp(`^${config.mediaDir}/`), ""), baseUrl);
    const linkPrefix = urlPath.replace(new RegExp(`${encodeURIComponent(file)}$`, "i"), "");
    const subtitles = files.filter(s => config.supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name));
    const subParams = (name: string) => /\.vtt$/i.test(name) ? "static=true" : /\.sub$/i.test(name) ? `video=${ext.replace(".", "")}` : "";
    return {
        cd: pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 1)[0]?.link : "/",
        title: fileNameNoExt,
        urlPath: `${urlPath}?static=true`,
        subtitles: subtitles.map(({ name }) => ({ name, path: `${linkPrefix}/${name}?${subParams(name)}` })),
        mimeType: ext.replace(/^\./, "video/"),
        prev: videos[videoIndex - 1]?.name ? `${linkPrefix}/${<string>videos[videoIndex - 1]?.name}?t=0` : "",
        next: videos[videoIndex + 1]?.name ? `${linkPrefix}/${<string>videos[videoIndex + 1]?.name}?t=0` : ""
    };
}
