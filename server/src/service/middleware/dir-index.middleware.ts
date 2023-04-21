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

            const [items, pills] = await viewData(req.path, req.baseUrl);
            return res.render("index", {
                page: "dir-index",
                items, pills,
                baseUrl: req.baseUrl
            });
        } catch (ex) {
            return next(ex);
        }
    }

    function viewData(dirPath: string, baseUrl: string) {
        const items = () => mediaAccessService.listDir(dirPath, baseUrl);
        const pills = () => mediaAccessService.pathLinks(dirPath, baseUrl);

        return Promise.all([items(), pills()]);
    }
}
