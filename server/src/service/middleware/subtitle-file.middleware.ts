import { Request, Response, NextFunction } from "express";
import { AppError } from "../../@types/AppError";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";
import { SubtitleAPI } from "../../domain/ports/API/SubtitleAPI";

export class SubtitleFileMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI,
        private readonly subtitleService: SubtitleAPI
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        if (req.query["static"] === "true" || !this.mediaAccessService.supportedSubtitleExtension(req.path))
            return next();

        const type = await this.mediaAccessService.type(req.path).catch(() => "error");
        if (type !== "file") {
            const err: AppError = Error("not found");
            err.status = 404;
            return next(err);
        }

        return Promise.resolve()
            .then(() => this.subtitleService.convert(req.path, <string>req.query["video"]))
            .then(data => res.setHeader("Content-type", "text/vtt; charset=UTF-8").end(data))
            .catch(err => next(err));
    }
}
