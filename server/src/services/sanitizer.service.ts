import fs from "node:fs";

import { Request } from "express";

export function requestParam(req: Request, paramName: string): string {
    const value = req.params[paramName];

    if (!value || typeof value !== "string") return "";

    switch (paramName) {
        case "script": return /^[a-z0-9-_.]+$/i.test(value) ? value : "";
        default: return value;
    }
}

export function requestQueryParam(req: Request, queryParamName: string): string {
    const value = req.query[queryParamName];

    if (!value || typeof value !== "string") return "";

    switch (queryParamName) {
        // case "credential": return /^.+\..+\..+$/i.test(value) ? value : "";
        case "redirect": return fs.existsSync(value) ? value : "/";
        case "video": return /^\.[a-z0-9]{3,4}$/i.test(value) ? value : "";
        default: return value;
    }
}
