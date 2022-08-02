import path from "node:path";

import { NextFunction, Request, Response } from "express";
import ejs from "ejs";

import { Pill } from "../@types/Pill";
import { AppRequest } from "../@types/AppRequest";
import { hasSubtitle, subtitle } from "../services/subtitle.service";
import { routes } from "../routes";
import { globals } from "../globals";
import { dirIndex, getPills } from "../services/dir.service";
import { ItemStat } from "../@types/ItemStat";

export async function preStaticMiddleware(req: Request, res: Response, next: NextFunction) {
    const request = <AppRequest>req;

    if (request.query["static"])
        return next();

    const fileExtension = path.extname(request.relativePath).toLowerCase();

    const { mime, data } = await (async () => {
        switch (fileExtension) {
            case ".mp4": {
                const pills = getPills(request.mediaPath);
                const fileName = pills[pills.length - 1]?.name;
                const rx = new RegExp(`${fileName}$`, "i");
                const parent = request.relativePath.replace(rx, "");
                let siblings = await dirIndex(parent, request.mediaPath.replace(rx, ""));
                if (siblings instanceof Error)
                    siblings = new Array<ItemStat>();
                siblings = siblings.filter(s => /\.mp4$/i.test(s.name));
                const fileIndex = siblings.findIndex(s => s.name === fileName);
                return {
                    mime: "text/html; charset=UTF-8",
                    data: await ejs.renderFile("src/views/index.ejs", {
                        page: "video",
                        pills: getPills(request.mediaPath),
                        hasSubtitle: hasSubtitle(request.mediaPath, fileExtension),
                        relativePath: request.relativePath,
                        fileExtension, mimeType: "video/mp4",
                        prev: <Pill>{ name: siblings[fileIndex - 1]?.name, link: parent + siblings[fileIndex - 1]?.name },
                        next: <Pill>{ name: siblings[fileIndex + 1]?.name, link: parent + siblings[fileIndex + 1]?.name }
                    })
                };
            }
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
