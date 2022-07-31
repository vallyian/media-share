import path from "node:path";

import { NextFunction, Response } from "express";

import { Request } from "../../@types/Request";
import { videoPlayer } from "../services/html.service";
import { subtitle } from "../services/subtitle.service";

export async function fileHandlerMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.query.static)
        return next();

    const { mime, data } = await (async () => {
        const fileExtension = path.extname(req.relativePath).toLowerCase();
        switch (fileExtension) {
            case ".mp4": return { mime: "text/html; charset=UTF-8", data: videoPlayer(req.relativePath, fileExtension, "video/mp4") };
            case ".vtt": return { mime: "text/vtt; charset=UTF-8", data: await subtitle(req.absolutePath, String(req.query.video || "")) };
            default: return { mime: "", data: "" };
        }
    })().catch(() => ({ mime: undefined, data: undefined }));

    return mime && data
        ? res.setHeader("Content-type", mime).end(data)
        : next();
}
