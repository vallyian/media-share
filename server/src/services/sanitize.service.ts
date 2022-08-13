import { Request } from "express";

import { videoExtensions } from "./video.service";

export function queryParams(req: Request) {
    return {
        get static() {
            return typeof req.query["static"] === "string" && req.query["static"] !== "";
        },
        get video() {
            return Object.keys(videoExtensions).find(e => e === req.query["video"]) || "";
        },
        get credential() {
            return typeof req.query["credential"] === "string"
                ? <string>req.query["credential"]
                : "";
        },
        get redirect() {
            return typeof req.query["redirect"] === "string"
                ? new URL(req.query["redirect"], `${req.protocol}://${req.get("host")}`).href
                : "/";
        }
    };
}
