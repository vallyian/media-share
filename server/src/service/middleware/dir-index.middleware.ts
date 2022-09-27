import { Request, Response, NextFunction } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export class DirIndexMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI,
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        return Promise.resolve()
            .then(async () => {
                const type = await this.mediaAccessService.type(req.path);
                if (type !== "dir")
                    return next();

                const items = await this.mediaAccessService.listDir(req.path, req.baseUrl);
                return res.render("index", {
                    baseUrl: req.baseUrl,
                    page: "dir-index",
                    pills: this.mediaAccessService.pathLinks(req.path, req.baseUrl),
                    items
                });
            })
            .catch(err => next(err));
    }
}
