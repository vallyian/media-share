import { Request } from "express";

const videoExtensions: Record<string, string> = {
    ".mp4": ".mp4"
};

const appScripts: Record<string, string> = {
    "auth.js": "auth.js",
    "video.js": "video.js"
};

export function queryParamVideo(req: Request): string {
    const video = req.query["video"];
    return typeof video === "string" && video && videoExtensions[<string>video]
        ? <string>videoExtensions[<string>video]
        : "";
}

export function paramScript(req: Request): string {
    const script = req.params["script"];
    return typeof script === "string" && script && appScripts[<string>script]
        ? <string>appScripts[<string>script]
        : "";
}
