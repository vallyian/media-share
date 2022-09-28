import { Request, Response, NextFunction } from "express";
import { AppError } from "../../@types/AppError";
import { Domain } from "../../domain";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export class VideoFileMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        if (req.query["static"] === "true" || !this.mediaAccessService.supportedVideoExtension(req.path))
            return next();

        const type = await this.mediaAccessService.type(req.path).catch(() => "error");
        if (type !== "file") {
            const err: AppError = Error("not found");
            err.status = 404;
            return next(err);
        }

        return Promise.resolve()
            .then(() => this.viewData(req.path, req.baseUrl))
            .then(data => res.render("index", {
                baseUrl: req.baseUrl,
                page: "video",
                ...data
            }))
            .catch(err => next(err));
    }

    private async viewData(videoPath: string, baseUrl: string): Promise<Record<string, unknown>> {
        const { parent, name, extension } = this.mediaAccessService.parsePath(videoPath);
        if (!parent || !name || !extension)
            throw Error("video file path invalid");
        const supportedVideosRx = new RegExp("(:?" + Domain.supportedVideos.map((e: string) => `\\.${e}`).join("|") + ")$", "i");
        const supportedSubtitlesRx = new RegExp("(:?" + Domain.supportedSubtitles.map((e: string) => `\\.${e}`).join("|") + ")$", "i");
        const fileNameNoExt = name.replace(`.${extension}`, "");
        const fileNameNoExtRx = new RegExp(`^${fileNameNoExt}`, "i");
        const files = await this.mediaAccessService.listDir(parent, baseUrl);
        const videos = files.filter(s => supportedVideosRx.test(s.name));
        const videoIndex = videos.findIndex(s => s.name === name);
        const pathLinks = this.mediaAccessService.pathLinks(videoPath, baseUrl);
        const urlPath = "/" + this.mediaAccessService.getSecureUrl(videoPath, baseUrl) + "?static=true";
        const subParams = (name: string) => /\.vtt$/i.test(name)
            ? "static=true"
            : /\.sub$/i.test(name)
                ? `video=${extension}`
                : "";
        const subtitles = files.filter(s => supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name))
            .map(({ name, link }) => ({ name, link: `${link}?${subParams(name)}` }));
        return {
            cd: pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 1)[0]?.link : "",
            title: fileNameNoExt,
            urlPath,
            subtitles,
            mimeType: `video/${extension}`,
            prev: videos[videoIndex - 1]?.name ? `${<string>videos[videoIndex - 1]?.link}?t=0` : "",
            next: videos[videoIndex + 1]?.name ? `${<string>videos[videoIndex + 1]?.link}?t=0` : ""
        };
    }
}
