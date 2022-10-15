import { Request, Response, NextFunction } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";
import { SubtitleAPI } from "../../domain/ports/API/SubtitleAPI";

export function SubtitleFileMiddleware(
    mediaAccessService: MediaAccessAPI,
    subtitleService: SubtitleAPI
) {
    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.query["static"] === "true" || !mediaAccessService.supportedSubtitleExtension(req.path))
                return next();

            const type = await mediaAccessService.type(req.path).catch(() => "error");
            if (type !== "file") {
                const err = Error("not found");
                err.status = 404;
                return next(err);
            }

            const data = await subtitleService.convert(req.path, <string>req.query["video"]);
            return res
                .setHeader("Content-type", "text/vtt; charset=UTF-8")
                .end(data);
        } catch (ex) {
            return next(ex);
        }
    }
}
