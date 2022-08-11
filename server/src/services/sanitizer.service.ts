import fs from "node:fs";
import path from "node:path";

import { Request } from "express";

export function requestParam(req: Request, paramName: string): string {
    const value = req.params[paramName];

    if (!value || typeof value !== "string") return "";

    switch (paramName) {
        case "script": return /^[a-z0-9-_.]+$/i.test(value) ? value : "";
        default: return value;
    }
}

export function sanitizeCredential(value: unknown): string {
    if (!value || typeof value !== "string")
        return "";
    const valueSanitized = String(value);
    return /^.+\..+\..+$/i.test(value)
        ? valueSanitized
        : "/";
}

export function sanitizeRedirect(value: unknown): string {
    if (!value || typeof value !== "string")
        return "";
    const valueSanitized = path.normalize(value);
    return fs.existsSync(valueSanitized)
        ? valueSanitized
        : "/";
}

export function sanitizeStatict(value: unknown): boolean {
    return String(value) === "true";
}

export function sanitizeVideo(value: unknown): string {
    if (!value || typeof value !== "string")
        return "";
    const valueSanitized = path.extname(value);
    return /^\.[a-z0-9]{3,4}$/i.test(valueSanitized)
        ? valueSanitized
        : "";
}
