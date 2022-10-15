import { Request, Response, NextFunction } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export function DirIndexMiddleware(
    mediaAccessService: MediaAccessAPI
) {
    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        try {
            const type = await mediaAccessService.type(req.path).catch(() => "error");
            if (type !== "dir")
                return next();

            const data = await viewData(req.path, req.baseUrl);
            return res.render("index", {
                page: "dir-index",
                ...data,
                baseUrl: req.baseUrl
            });
        } catch (ex) {
            return next(ex);
        }
    }

    async function viewData(dirPath: string, baseUrl: string) {
        const items = await mediaAccessService.listDir(dirPath, baseUrl);
        const pills = mediaAccessService.pathLinks(dirPath, baseUrl);
        return { items, pills };
    }
}
