import { Request } from "express";

const videoExtensions: Record<string, string> = {
    ".mp4": ".mp4"
};

export function queryParamVideo(req: Request) {
    const video = req.query["video"];
    return typeof video === "string" && video && videoExtensions[<string>video]
        ? videoExtensions[<string>video]
        : "";
}
