import { NextFunction, Request, Response } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export function MediaSyncRoute(
    mediaAccessService: MediaAccessAPI
) {
    return handler;

    async function handler(req: Request, res: Response, next: NextFunction) {
        try {
            const filePath = decodeURIComponent(new URL(req.get("referer") || "").pathname);
            const type = await mediaAccessService.type(filePath);
            if (type !== "file")
                throw Error("referer not a file");
            // TODO: cluster safe media-sync in memory storage
            return res.status(200).end();
        } catch (ex) {
            const err = ex instanceof Error ? ex : Error(<string>ex);
            err.status = 400;
            return next(err);
        }
    }
}
