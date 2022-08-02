import path from "node:path";

import { NextFunction, Request, Response } from "express";
import ejs from "ejs";

import { AppRequest } from "../@types/AppRequest";
import { subtitle } from "../services/subtitle.service";
import { routes } from "../routes";
import { globals } from "../globals";

export async function preStaticMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    if (request.query["static"])
        return next();

    const fileExtension = path.extname(request.relativePath).toLowerCase();

    const { mime, data } = await (async () => {
        switch (fileExtension) {
            case ".mp4": return {
                mime: "text/html; charset=UTF-8",
                data: await ejs.renderFile("src/views/partials/video.ejs", { relativePath: request.relativePath, fileExtension, mimeType: "video/mp4" })
            };
            case ".vtt": return {
                mime: "text/vtt; charset=UTF-8",
                data: await subtitle(request.mediaPath, String(request.query["video"] || ""))
            };
            default: return { mime: "", data: "" };
        }
    })().catch(err => {
        globals.console.error(err);
        return { mime: undefined, data: undefined };
    });

    return mime && data
        ? res.setHeader("Content-type", mime).end(data)
        : next();
}

export async function postStaticMiddleware(req: Request, res: Response, next: NextFunction) {
    const { mime, data } = await (async () => {
        switch (req.path) {
            case routes.favicon: return { mime: "image/svg+xml", data: await ejs.renderFile("src/views/icons/share-fill.svg", { fill: "#0080FF" }) };
            default: return { mime: "", data: "" };
        }
    })().catch(() => ({ mime: undefined, data: undefined }));

    return mime && data
        ? res.setHeader("Content-type", mime).end(data)
        : next();
}
