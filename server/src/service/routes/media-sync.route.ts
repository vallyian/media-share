import { Request, Response } from "express";
import { MediaAccessAPI } from "../../domain/ports/API/MediaAccess.API";

export class MediaSyncRoute {
    constructor(
        private mediaAccessService: MediaAccessAPI
    ) { }

    async handler(req: Request, res: Response) {
        let filePath = "";
        return Promise.resolve()
            .then(() => filePath = decodeURIComponent(new URL(req.get("referer") || "").pathname))
            .then(() => this.mediaAccessService.type(filePath))
            .then(type => type === "file" || Promise.reject("referer not a file"))
            .then(() => void 0) // TODO: cluster safe media-sync in memory storage
            .then(() => res.status(200).end())
            .catch(err => {
                console.error(err);
                res.status(400).end();
            });
    }
}
