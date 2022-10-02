import { Request, Response, NextFunction } from "express";
import { Domain } from "../../domain";
import { MediaStat } from "../../domain/objects/MediaStat";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

type Playlist = MediaStat & { list: "prev" | "current" | "next" | undefined }

export class MediaPlayerFileMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        if (req.query["static"] === "true")
            return next();

        if (
            !this.mediaAccessService.supportedAudioExtension(req.path) &&
            !this.mediaAccessService.supportedVideoExtension(req.path)
        ) return next();

        const type = await this.mediaAccessService.type(req.path).catch(() => "error");
        if (type !== "file")
            return next();

        return Promise.resolve()
            .then(() => this.viewData(req.path, req.baseUrl))
            .then(data => res.render("index", {
                page: "media-player",
                ...data,
                baseUrl: req.baseUrl
            }))
            .catch(err => next(err));
    }

    private async viewData(videoPath: string, baseUrl: string) {
        const { parent, name, extension } = this.mediaAccessService.parsePath(videoPath);
        if (!parent || !name || !extension)
            throw Error("media file path invalid");
        const title = name.replace(`.${extension}`, "");
        const files = await this.mediaAccessService.listDir(parent, baseUrl);
        const playlist = <Playlist[]>(() => {
            const supportedAudioVideosRx = new RegExp("(:?" + Domain.supportedAudios.concat(Domain.supportedVideos).map((e: string) => `\\.${e}`).join("|") + ")$", "i");
            const list = files.filter(s => supportedAudioVideosRx.test(s.name));
            const index = list.findIndex(s => s.name === name);
            if (index !== -1) {
                if (list[index - 1]) (<Playlist>list[index - 1]).list = "prev";
                (<Playlist>list[index]).list = "current";
                if (list[index + 1]) (<Playlist>list[index + 1]).list = "next";
            }
            return list;
        })();
        const pathLinks = this.mediaAccessService.pathLinks(videoPath, baseUrl);
        const cd = pathLinks.length >= 2
            ? pathLinks.splice(pathLinks.length - 2, 1)[0]?.link
            : "";
        const urlPath = "/" + this.mediaAccessService.getSecureUrl(videoPath, baseUrl) + "?static=true";
        const subtitles = (() => {
            const subParams = (name: string) => /\.vtt$/i.test(name) ? "static=true"
                : /\.sub$/i.test(name) && Domain.supportedVideos.includes(extension) ? `video=${extension}`
                    : "";
            const supportedSubtitlesRx = new RegExp("(:?" + Domain.supportedSubtitles.map((e: string) => `\\.${e}`).join("|") + ")$", "i");
            const fileNameNoExtRx = new RegExp(`^${title}`, "i");
            return files.filter(s => supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name))
                .map(({ name, link }) => ({ name, link: `${link}?${subParams(name)}` }));
        })();
        const mimeType = Domain.supportedAudios.includes(extension)
            ? `audio/${extension}`
            : `video/${extension}`;
        return { cd, title, urlPath, subtitles, mimeType, playlist };
    }
}
