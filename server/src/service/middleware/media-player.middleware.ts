import { Request, Response, NextFunction } from "express";
import { Domain } from "../../domain";
import { MediaStat } from "../../domain/objects/MediaStat";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

type Playlist = MediaStat & { list: "prev" | "current" | "next" | undefined }

export function MediaPlayerFileMiddleware(
    mediaAccessService: MediaAccessAPI
) {
    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.query["static"] === "true")
                return next();

            if (
                !mediaAccessService.supportedAudioExtension(req.path) &&
                !mediaAccessService.supportedVideoExtension(req.path)
            ) return next();

            const type = await mediaAccessService.type(req.path).catch(() => "error");
            if (type !== "file")
                return next();

            const data = await viewData(req.path, req.baseUrl);
            return res.render("index", {
                page: "media-player",
                ...data,
                baseUrl: req.baseUrl
            });
        } catch (ex) {
            return next(ex);
        }
    }

    async function viewData(videoPath: string, baseUrl: string) {
        const { parent, name, extension } = mediaAccessService.parsePath(videoPath);
        if (!parent || !name || !extension) throw Error("media file path invalid");
        const title = name.replace(`.${extension}`, "");
        const files = await mediaAccessService.listDir(parent, baseUrl);
        const playlist = viewDataPlaylist(files, name);
        const pathLinks = mediaAccessService.pathLinks(videoPath, baseUrl);
        const cd = pathLinks.length >= 2 ? pathLinks.splice(pathLinks.length - 2, 1)[0]?.link : "";
        const urlPath = "/" + mediaAccessService.getSecureUrl(videoPath, baseUrl) + "?static=true";
        const subtitles = viewDataSubtitles(files, title, extension);
        const mimeType = (Domain.supportedAudios.includes(extension) ? "audio" : "video") + "/" + extension;
        return { cd, title, urlPath, subtitles, mimeType, playlist };
    }

    function viewDataPlaylist(files: MediaStat[], name: string): Playlist[] {
        const supportedAudioVideosRx = new RegExp("(:?" + Domain.supportedAudios.concat(Domain.supportedVideos).map((e: string) => `\\.${e}`).join("|") + ")$", "i");
        const list = <Playlist[]>files.filter(s => supportedAudioVideosRx.test(s.name));
        const index = list.findIndex(s => s.name === name);
        if (index !== -1) {
            if (list[index - 1]) (<Playlist>list[index - 1]).list = "prev";
            (<Playlist>list[index]).list = "current";
            if (list[index + 1]) (<Playlist>list[index + 1]).list = "next";
        }
        return list;
    }

    function viewDataSubtitles(files: MediaStat[], title: string, extension: string) {
        const subParams = (name: string) => {
            if (/\.vtt$/i.test(name)) return "static=true";
            if (/\.sub$/i.test(name) && Domain.supportedVideos.includes(extension)) return `video=${extension}`;
            return "";
        };
        const supportedSubtitlesRx = new RegExp("(:?" + Domain.supportedSubtitles.map((e: string) => `\\.${e}`).join("|") + ")$", "i");
        const fileNameNoExtRx = new RegExp(`^${title}`, "i");
        const subtitles = files
            .filter(s => supportedSubtitlesRx.test(s.name) && fileNameNoExtRx.test(s.name))
            .map(({ name, link }) => ({ name, link: `${link}?${subParams(name)}` }));
        return subtitles;
    }
}
