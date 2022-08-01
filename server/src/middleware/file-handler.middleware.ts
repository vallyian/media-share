import path from "node:path";

import { NextFunction, Request, Response } from "express";

import { AppRequest } from "../@types/AppRequest";
import { videoPlayer } from "../services/html.service";
import { subtitle } from "../services/subtitle.service";

export async function fileHandlerMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    if (request.query["static"])
        return next();

    const { mime, data } = await (async () => {
        const fileExtension = path.extname(request.relativePath).toLowerCase();
        switch (fileExtension) {
            case ".mp4": return { mime: "text/html; charset=UTF-8", data: videoPlayer(request.relativePath, fileExtension, "video/mp4") };
            case ".vtt": return { mime: "text/vtt; charset=UTF-8", data: await subtitle(request.absolutePath, String(request.query["video"] || "")) };
            default: return { mime: "", data: "" };
        }
    })().catch(() => ({ mime: undefined, data: undefined }));

    return mime && data
        ? res.setHeader("Content-type", mime).end(data)
        : next();
}
