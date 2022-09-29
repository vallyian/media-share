import { Request, Response, NextFunction } from "express";
import { AppError } from "../../@types/AppError";
import { Domain } from "../../domain";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export class MediaPlayerFileMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        if (req.query["static"] === "true")
            return next();
        if (!this.mediaAccessService.supportedAudioExtension(req.path) && !this.mediaAccessService.supportedVideoExtension(req.path))
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
                page: "media-player",
                ...data
            }))
            .catch(err => next(err));
    }

    private async viewData(videoPath: string, baseUrl: string): Promise<Record<string, unknown>> {
        const { parent, name, extension } = this.mediaAccessService.parsePath(videoPath);
        if (!parent || !name || !extension)
            throw Error("media file path invalid");
        const title = name.replace(`.${extension}`, "");
        const files = await this.mediaAccessService.listDir(parent, baseUrl);
        const avFiles = (() => {
            const supportedAudioVideosRx = new RegExp("(:?" + Domain.supportedAudios.concat(Domain.supportedVideos).map((e: string) => `\\.${e}`).join("|") + ")$", "i");
            return files.filter(s => supportedAudioVideosRx.test(s.name));
        })();
        const avIndex = avFiles.findIndex(s => s.name === name);
        const pathLinks = this.mediaAccessService.pathLinks(videoPath, baseUrl);
        const cd = pathLinks.length >= 2
            ? pathLinks.splice(pathLinks.length - 2, 1)[0]?.link
            : "";
        const urlPath = "/" + this.mediaAccessService.getSecureUrl(videoPath, baseUrl) + "?static=true";
        const subtitles = (() => {
            if (Domain.supportedAudios.includes(extension))
                return [];
            const subParams = (name: string) => /\.vtt$/i.test(name)
                ? "static=true"
                : /\.sub$/i.test(name)
                    ? `video=${extension}`
                    : "";
            const supportedSubtitlesRx = new RegExp("(:?" + Domain.supportedSubtitles.map((e: string) => `\\.${e}`).join("|") + ")$", "i");
            const fileNameNoExtRx = new RegExp(`^${title}`, "i");
            return files.filter(s => supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name))
                .map(({ name, link }) => ({ name, link: `${link}?${subParams(name)}` }));
        })();
        const mimeType = Domain.supportedAudios.includes(extension)
            ? `audio/${extension}`
            : `video/${extension}`;
        const prev = avFiles[avIndex - 1]?.name ? `${<string>avFiles[avIndex - 1]?.link}?t=0` : "";
        const next = avFiles[avIndex + 1]?.name ? `${<string>avFiles[avIndex + 1]?.link}?t=0` : "";
        return { cd, title, urlPath, subtitles, mimeType, prev, next };
    }
}
