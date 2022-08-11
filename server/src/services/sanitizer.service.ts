import { Request } from "express";

const videoExtensions: Record<string, string> = {
    ".mp4": ".mp4"
};

export function queryParamVideo(req: Request): string {
    const video = req.query["video"];
    return typeof video === "string" && video && videoExtensions[<string>video]
        ? <string>videoExtensions[<string>video]
        : "";
}
