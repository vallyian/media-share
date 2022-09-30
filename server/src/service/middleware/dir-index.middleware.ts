import { Request, Response, NextFunction } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export class DirIndexMiddleware {
    constructor(
        private readonly mediaAccessService: MediaAccessAPI,
    ) { }

    async handler(req: Request, res: Response, next: NextFunction) {
        const type = await this.mediaAccessService.type(req.path).catch(() => "error");
        if (type !== "dir")
            return next();

        return Promise.resolve()
            .then(() => this.viewData(req.path, req.baseUrl))
            .then(data => res.render("index", {
                page: "dir-index",
                ...data,
                baseUrl: req.baseUrl
            }))
            .catch(err => next(err));
    }

    private async viewData(dirPath: string, baseUrl: string) {
        const items = await this.mediaAccessService.listDir(dirPath, baseUrl);
        const pills = this.mediaAccessService.pathLinks(dirPath, baseUrl);
        return { items, pills };
    }
}
