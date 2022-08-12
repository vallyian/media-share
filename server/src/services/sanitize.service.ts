import fs from "node:fs";
import path from "node:path";

import { Request } from "express";

import { env } from "../env";
import { videoExtensions } from "./video.service";

const appScripts = fs.readdirSync(path.join(env.VIEWS_DIR, "scripts")).filter(i => /^[a-z0-9-_.]+\.js$/i.test(i));

export function queryParams(req: Request) {
    return {
        get static() { return typeof req.query["static"] === "string" && req.query["static"] !== ""; },
        get video() { return Object.keys(videoExtensions).find(e => e === req.query["video"]) || ""; },
        get credential() { return typeof req.query["credential"] === "string" ? <string>req.query["credential"] : ""; },
        get redirect() {
            return typeof req.query["redirect"] === "string"
                ? new URL(req.query["redirect"], `${req.protocol}://${req.get("host")}`).href
                : "/";
        }
    };
}

export function params(req: Request) {
    return {
        get script() { return appScripts.find(s => s === req.params["script"]) || ""; }
    };
}
